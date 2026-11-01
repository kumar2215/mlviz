import math
import unittest
from copy import deepcopy
from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.neural_networks import router
from models.neural_networks import PerceptronRequest, SingleLayerRequest, MlpRequest, TrainingRequest
from services.neural_network_service import run_lab
from services.neural_network_math import (
    ACTIVATIONS, GATES, SOLVED_XOR, activate, derivative, analyze, batch_analysis,
    forward, softmax, initialize, edit_parameter, update_network, make_mask, dropout,
)
from services.neural_network_data import character_features

REQUESTS = dict(perceptron=PerceptronRequest, single_layer=SingleLayerRequest, mlp=MlpRequest, training=TrainingRequest)

class NeuralMathTests(unittest.TestCase):
    def close(self, actual, expected, tolerance=1e-5):
        self.assertAlmostEqual(actual, expected, delta=tolerance * max(1, abs(expected)))

    def test_forward_matrix_orientation_and_bias(self):
        network = [dict(weights=[[1, 2], [-1, .5]], biases=[.3, -.2], activation='tanh'), dict(weights=[[.4, -.7]], biases=[.1], activation='sigmoid')]
        trace = forward(network, [.2, .8])
        self.close(trace['z'][0][0], 2.1)
        self.close(trace['z'][0][1], 0)
        self.close(trace['a'][2][0], activate(.4 * math.tanh(2.1) + .1, 'sigmoid'))

    def test_activation_derivatives(self):
        for kind in ACTIVATIONS:
            for x in [-2, -.4, .3, 2]:
                self.close(derivative(x, kind), (activate(x + 1e-6, kind) - activate(x - 1e-6, kind)) / 2e-6)
        self.assertEqual(derivative(0, 'ReLU'), 0)
        self.assertEqual(derivative(1, 'hard tanh'), 0)

    def test_every_gradient_against_finite_differences(self):
        configurations = [(a, 'sigmoid', loss, target) for a in ACTIVATIONS for loss, target in [('MSE', [.3]), ('MAE', [.3]), ('Binary cross-entropy', [1])]]
        configurations += [('tanh', 'softmax', loss, [0, 1, 0]) for loss in ['Categorical cross-entropy', 'MSE', 'MAE']]
        for activation, output, loss, target in configurations:
            network = initialize([2, 3, len(target)], activation, 13, output)
            original = deepcopy(network)
            analysis = analyze(network, [.4, -.6], target, loss)
            for l, layer in enumerate(network):
                for j, row in enumerate(layer['weights']):
                    for k in [*range(len(row)), -1]:
                        value = row[k] if k >= 0 else layer['biases'][j]
                        selected = dict(layer=l, row=j, column=k)
                        plus = analyze(edit_parameter(network, selected, value + 1e-5), [.4, -.6], target, loss)['loss']
                        minus = analyze(edit_parameter(network, selected, value - 1e-5), [.4, -.6], target, loss)['loss']
                        actual = analysis['gradients'][l]['weights'][j][k] if k >= 0 else analysis['gradients'][l]['biases'][j]
                        self.close(actual, (plus - minus) / 2e-5)
            self.assertEqual(network, original)

    def test_extreme_cross_entropy_scores_are_stable(self):
        self.close(sum(softmax([10000, 9999, -10000])), 1)
        binary = analyze([dict(weights=[[1000]], biases=[0], activation='sigmoid')], [1], [0], 'Binary cross-entropy')
        self.close(binary['loss'], 1000)
        self.close(binary['gradients'][0]['weights'][0][0], 1)
        multi = analyze([dict(weights=[[1000], [-1000]], biases=[0, 0], activation='softmax')], [1], [0, 1], 'Categorical cross-entropy')
        self.close(multi['loss'], 2000)

    def test_batch_mean_and_gradient_step(self):
        network = initialize([2, 2, 1], 'sigmoid', 21)
        batch = batch_analysis(network, GATES['XOR'], 'Binary cross-entropy')
        expected = sum(analyze(network, s['x'], s['y'], 'Binary cross-entropy')['gradients'][0]['weights'][0][0] for s in GATES['XOR']) / 4
        self.close(batch['gradients'][0]['weights'][0][0], expected)
        after = update_network(network, batch['gradients'], .1)
        self.assertLess(batch_analysis(after, GATES['XOR'], 'Binary cross-entropy')['loss'], batch['loss'])

    def test_xor_solution(self):
        for sample in GATES['XOR']:
            self.assertEqual(int(forward(SOLVED_XOR, sample['x'])['a'][-1][0] >= .5), sample['y'][0])

    def test_dropout_mask_scaling_and_inference(self):
        mask = make_mask(3, 4, .5, 42, True)
        self.assertEqual(mask[0], mask[1])
        self.assertEqual(mask, make_mask(3, 4, .5, 42, True))
        self.assertEqual(dropout([[2, 4]], [[1, 0]], .5, True), [[4, 0]])
        self.assertEqual(dropout([[2, 4]], [[1, 0]], .5, False), [[2, 4]])
        self.assertEqual(make_mask(1, 4, 0, 1, False), [[1, 1, 1, 1]])
        average = sum(dropout([[2]], make_mask(1, 1, .5, seed, False), .5, True)[0][0] for seed in range(4000)) / 4000
        self.close(average, 2, .04)

class NeuralApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app = FastAPI()
        app.include_router(router, prefix='/api/neural_networks')
        cls.client = TestClient(app)

    def calculate(self, lab, state=None, **command):
        response = self.client.post(f'/api/neural_networks/{lab}', json=dict(state=state, command=command))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_all_routes_return_valid_initial_state_and_chart_samples(self):
        for lab in REQUESTS:
            reply = self.calculate(lab)
            self.assertIn('network', reply['state'])
            self.assertTrue(reply['result'])
        grid = self.calculate('perceptron')['result']['boundary']
        self.assertEqual(len(grid['values']), grid['n'] ** 2)

    def test_perceptron_learning_and_history(self):
        state = self.calculate('perceptron')['state']
        state.update(input=[1, 0], target=0, custom=True, rate=.1)
        reply = self.calculate('perceptron', state, action='learn')
        self.assertEqual(reply['state']['network'][0]['weights'][0], [.5, -.4])
        self.assertEqual(reply['state']['network'][0]['biases'], [0])
        self.assertEqual(reply['state']['history'][0]['error'], -1)
        self.assertIn('0.5 × 1 = 0.5', reply['result']['equations'][1])

    def test_language_features_and_predictions(self):
        features = character_features('Aa b! 123')
        self.assertEqual(features['total'], 3)
        self.assertAlmostEqual(features['features'][0], 2 / 3)
        state = self.calculate('single_layer')['state']
        for expected, text in enumerate(['Hello, how are you today?', 'Bonjour, comment allez vous?', 'Guten Tag, wie geht es Ihnen?']):
            state['text'] = text
            reply = self.calculate('single_layer', state)
            self.assertEqual(reply['result']['language']['winner'], expected)
        state['text'] = '123!'
        self.assertEqual(self.calculate('single_layer', state)['result']['total'], 0)

    def test_numeric_score_edits_and_language_model_are_independent(self):
        state = self.calculate('single_layer')['state']
        reply = self.calculate('single_layer', state, action='score', index=0, value=2)
        self.assertAlmostEqual(reply['result']['numeric']['scores'][0], 2)
        self.assertEqual(reply['state']['languageNetwork'], state['languageNetwork'])
        shifted = self.calculate('single_layer', state, action='shift')
        for a, b in zip(shifted['result']['numeric']['probabilities'], self.calculate('single_layer', state)['result']['numeric']['probabilities']):
            self.assertAlmostEqual(a, b)

    def test_architecture_solution_and_mask_actions(self):
        state = self.calculate('mlp')['state']
        state.update(hidden=[3, 2], activation='ReLU')
        reply = self.calculate('mlp', state, action='architecture')
        self.assertEqual([len(layer['biases']) for layer in reply['state']['network']], [3, 2, 1])
        solved = self.calculate('mlp', reply['state'], action='solution')
        self.assertEqual(solved['result']['multi']['correct'], 4)
        state = solved['state']
        state['dropoutVariant'] = 'feature'
        masked = self.calculate('mlp', state, action='mask')['state']
        toggled = self.calculate('mlp', masked, action='toggle', selection=dict(layer=0, row=1, column=0))['state']
        self.assertTrue(all(row[0] == 1 - masked['mask'][0][0] for row in toggled['mask']))

    def test_training_preview_matches_applied_update(self):
        current = self.calculate('training')
        reply = self.calculate('training', current['state'], action='apply')
        self.assertEqual(reply['state']['network'], current['result']['proposed'])
        self.assertAlmostEqual(reply['state']['history'][-1], current['result']['afterLoss'])
        self.assertLess(reply['state']['history'][-1], reply['state']['history'][0])

    def test_invalid_configuration_and_command_are_rejected(self):
        state = self.calculate('perceptron')['state']
        state['input'] = [1]
        self.assertEqual(self.client.post('/api/neural_networks/perceptron', json=dict(state=state)).status_code, 400)
        self.assertEqual(self.client.post('/api/neural_networks/perceptron', json=dict(command=dict(action='train'))).status_code, 400)
        state = self.calculate('mlp')['state']
        state['dropoutP'] = 1
        self.assertEqual(self.client.post('/api/neural_networks/mlp', json=dict(state=state)).status_code, 422)
        state['dropoutP'] = .5
        state['mask'][0][0] = 2
        self.assertEqual(self.client.post('/api/neural_networks/mlp', json=dict(state=state)).status_code, 400)

if __name__ == '__main__':
    unittest.main()
