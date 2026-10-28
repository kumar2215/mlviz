"""Stateless lab actions and all derived values rendered by the frontend."""
import math
from copy import deepcopy
from models.neural_networks import PerceptronData, SingleLayerData, MlpData, TrainingData
from services.neural_network_data import ALPHABET, LANGUAGES, character_features, language_model
from services.neural_network_math import (
    ACTIVATIONS, GATES, SOLVED_XOR, activate, derivative, softmax, forward,
    loss_value, analyze, batch_analysis, initialize, update_network, make_mask,
    dropout, edit_parameter, selected_value, dot, fmt, curve, grid,
)

DATA_MODELS = dict(perceptron=PerceptronData, single_layer=SingleLayerData, mlp=MlpData, training=TrainingData)

def initial(lab):
    if lab == 'perceptron':
        return dict(network=[dict(weights=[[.6, -.4]], biases=[.1], activation='linear')], input=[0, 1], target=0, output='step', threshold=.5, phase=0, seed=12, rate=.1, gate='AND', sample=1, custom=False, playing=False, history=[])
    if lab == 'single_layer':
        return dict(network=[dict(weights=[[.7, -.2, .4], [-.3, .8, .1], [.2, .1, -.6]], biases=[.1, -.2, .3], activation='softmax')], languageNetwork=language_model(), input=[.8, .3, .5], row=0, phase=0, seed=8, text="Bonjour, comment allez vous aujourd'hui?", languageMode='multi', decision='sigmoid', feature=0)
    if lab == 'mlp':
        return dict(network=initialize([2, 2, 1], 'tanh', 17), input=[0, 1], seed=17, hidden=[2], activation='tanh', selected=dict(layer=0, row=0, column=0), forwardPhase=0, xorMode='single', single=[1, 1, -.5], rate=.3, history=[], playing=False, dropoutP=.5, mask=make_mask(3, 4, .5, 4, False), dropoutValues=[[.2, .8, 1.2, -.6], [.5, -.4, .9, .3], [-.7, .6, .1, 1.1]], dropoutVariant='element', training=True, maskSeed=4, message='')
    return dict(network=initialize([2, 2, 1], 'sigmoid', 21), seed=21, input=[0, 1], target=[1], loss='Binary cross-entropy', rate=.3, phase=0, selected=dict(layer=0, row=0, column=1), batch=False, history=[], playing=False, message='', explorerLoss='MSE', lossPrediction=.6, lossTarget=1, lossClass=0, lossScores=[1, 0, -1])

def validate_network(network, inputs, outputs=None):
    width = len(inputs)
    for layer in network:
        if any(len(row) != width for row in layer['weights']):
            raise ValueError('Each layer must accept the previous layer’s output width.')
        width = len(layer['biases'])
    if outputs is not None and width != outputs: raise ValueError('Unexpected network output width.')

def validate_state(lab, s):
    expected = 3 if lab == 'single_layer' else 2
    if len(s['input']) != expected: raise ValueError(f'This lab requires {expected} inputs.')
    validate_network(s['network'], s['input'], 3 if lab == 'single_layer' else 1)
    if lab in ('perceptron', 'single_layer') and len(s['network']) != 1:
        raise ValueError('This lab uses a single affine layer.')
    if lab == 'perceptron':
        if s['target'] not in (0, 1) or s['network'][0]['activation'] != 'linear':
            raise ValueError('The perceptron uses a linear score and a binary target.')
    if lab == 'single_layer':
        validate_network(s['languageNetwork'], ALPHABET, 3)
        if len(s['languageNetwork']) != 1: raise ValueError('The language model uses one layer.')
        if s['network'][0]['activation'] != 'softmax' or s['languageNetwork'][0]['activation'] != 'softmax':
            raise ValueError('Single-layer classifiers use softmax outputs.')
    if lab == 'mlp':
        if len(s['single']) != 3: raise ValueError('A single XOR neuron needs two weights and a bias.')
        if [len(layer['biases']) for layer in s['network'][:-1]] != s['hidden']:
            raise ValueError('Hidden-layer widths must match the architecture.')
        if s['activation'] not in ACTIVATIONS or any(layer['activation'] != s['activation'] for layer in s['network'][:-1]) or s['network'][-1]['activation'] != 'sigmoid':
            raise ValueError('The network must use the selected hidden activation and a sigmoid output.')
        if len(s['mask']) != 3 or len(s['dropoutValues']) != 3 or any(len(row) != 4 for row in s['mask'] + s['dropoutValues']):
            raise ValueError('Dropout matrices must have shape 3 × 4.')
        if any(value not in (0, 1) for row in s['mask'] for value in row): raise ValueError('Mask values must be 0 or 1.')
        if s['dropoutVariant'] == 'feature' and any(row != s['mask'][0] for row in s['mask']):
            raise ValueError('Feature dropout shares the mask across positions.')
    if lab == 'training':
        if [len(layer['biases']) for layer in s['network']] != [2, 1] or any(layer['activation'] != 'sigmoid' for layer in s['network']):
            raise ValueError('The training lab uses a 2–2–1 sigmoid network.')
        if len(s['target']) != 1 or not 0 <= s['target'][0] <= 1: raise ValueError('Network targets must lie between 0 and 1.')
        if len(s['lossScores']) != 3: raise ValueError('The loss explorer uses three scores.')
        if s['explorerLoss'] == 'Binary cross-entropy' and (not 0 <= s['lossTarget'] <= 1 or not 0 <= s['lossPrediction'] <= 1):
            raise ValueError('Binary loss requires a probability and target between 0 and 1.')
    if lab in ('mlp', 'training'):
        selected_value(s['network'], s['selected'])

def training_samples(s):
    return GATES['XOR'] if s['batch'] else [dict(x=s['input'], y=s['target'])]

ALLOWED_ACTIONS = dict(
    perceptron={'evaluate', 'reset', 'initialize', 'learn', 'parameter', 'sample'},
    single_layer={'evaluate', 'reset', 'initialize', 'parameter', 'score', 'shift'},
    mlp={'evaluate', 'reset', 'initialize', 'architecture', 'solution', 'train', 'mask', 'toggle', 'parameter'},
    training={'evaluate', 'reset', 'initialize', 'apply', 'parameter'},
)

def perform(lab, s, command):
    action = command.action
    if action not in ALLOWED_ACTIONS[lab]: raise ValueError('This action is not available in this lab.')
    if action == 'parameter':
        if command.selection is None: raise ValueError('Select a parameter to edit.')
        key = 'languageNetwork' if lab == 'single_layer' and command.language else 'network'
        s[key] = edit_parameter(s[key], command.selection.model_dump(), command.value)
        if 'history' in s: s.update(history=[], playing=False)
        if 'phase' in s: s['phase'] = 0
    if action == 'sample':
        if command.index > 3: raise ValueError('Choose one of four gate examples.')
        sample = GATES[s['gate']][command.index]
        s.update(sample=command.index, input=list(sample['x']), target=sample['y'][0], custom=False)
    if action in ('initialize', 'architecture'):
        s['seed'] += 1
        if lab == 'perceptron':
            s['network'] = initialize([2, 1], 'linear', s['seed'], 'linear')
            s['network'][0]['biases'][0] = (s['seed'] % 7 - 3) / 10
        elif lab == 'single_layer': s['network'] = initialize([3, 3], 'linear', s['seed'], 'softmax')
        else:
            s['network'] = initialize([2, *(s['hidden'] if lab == 'mlp' else [2]), 1], s['activation'] if lab == 'mlp' else 'sigmoid', s['seed'])
            s['selected'] = dict(layer=0, row=0, column=0)
        for field, value in dict(history=[], playing=False, phase=0, forwardPhase=0, message='').items():
            if field in s: s[field] = value
    if action == 'solution': s.update(network=deepcopy(SOLVED_XOR), hidden=[2], activation='tanh', xorMode='nonlinear', selected=dict(layer=0, row=0, column=0), forwardPhase=0, history=[], playing=False, message='Loaded an explicit 2–2–1 XOR solution. Inspect or edit any weight.')
    if action == 'mask':
        s['maskSeed'] += 1
        s['mask'] = make_mask(3, 4, s['dropoutP'], s['maskSeed'], s['dropoutVariant'] == 'feature')
    if action == 'toggle':
        selection = command.selection
        if selection is None or selection.row > 2 or not 0 <= selection.column < 4: raise ValueError('Select a mask cell within the 3 × 4 matrix.')
        for i, row in enumerate(s['mask']):
            if i == selection.row or s['dropoutVariant'] == 'feature': row[selection.column] = 1 - row[selection.column]
    if action == 'score':
        if command.index > 2: raise ValueError('Select one of three scores.')
        score = forward(s['network'], s['input'])['z'][0][command.index]
        s['network'][0]['biases'][command.index] += command.value - score
    if action == 'shift': s['network'][0]['biases'] = [b + 1 for b in s['network'][0]['biases']]
    if action == 'learn':
        if len(s['history']) >= 1000:
            s['playing'] = False
            return
        before = s['network'][0]['weights'][0] + s['network'][0]['biases']
        prediction = int(forward(s['network'], s['input'])['z'][0][0] >= 0)
        error = s['target'] - prediction
        after = [w + s['rate'] * error * x for w, x in zip(before, s['input'] + [1], strict=True)]
        s['network'][0].update(weights=[after[:2]], biases=[after[2]])
        s['history'].append(dict(iteration=len(s['history']) + 1, x=list(s['input']), target=s['target'], prediction=prediction, error=error, before=before, after=after, rate=s['rate']))
        if not s['custom']:
            s['sample'] = (s['sample'] + 1) % 4
            sample = GATES[s['gate']][s['sample']]
            s.update(input=list(sample['x']), target=sample['y'][0])
    if action in ('train', 'apply'):
        limit = 1000 if action == 'train' else 1001
        if len(s['history']) >= limit:
            s.update(playing=False, message='Paused after 1,000 updates. Reinitialize to start again.')
            return
        samples = GATES['XOR'] if action == 'train' else training_samples(s)
        kind = 'Binary cross-entropy' if action == 'train' else s['loss']
        current = batch_analysis(s['network'], samples, kind)
        network = update_network(s['network'], current['gradients'], s['rate'])
        loss = batch_analysis(network, samples, kind)['loss']
        s['network'] = network
        if action == 'apply':
            s.update(phase=0, message=f"Update {max(1, len(s['history']))} applied. Loss {current['loss']:.5f} → {loss:.5f}.")
            if not s['history']: s['history'].append(current['loss'])
        s['history'].append(loss)
        s['playing'] = s['playing'] and loss > (.001 if action == 'train' else .00001)

def perceptron_result(s):
    w, b, x = s['network'][0]['weights'][0], s['network'][0]['biases'][0], s['input']
    z = dot(w, x) + b
    sigmoid = activate(z, 'sigmoid')
    output = int(z >= 0) if s['output'] == 'step' else sigmoid
    prediction = int(z >= 0) if s['output'] == 'step' else int(output >= s['threshold'])
    products = [a * c for a, c in zip(w, x, strict=True)]
    hard = lambda inputs: int(dot(w, inputs) + b >= 0)
    old = s['history'][-1]['before'] if s['history'] else None
    return dict(z=z, output=output, prediction=prediction, step=int(z >= 0), sigmoid=sigmoid,
        equations=[f"Input x = [{', '.join(map(fmt, x))}]ᵀ", '; '.join(f'{fmt(a)} × {fmt(c)} = {fmt(p)}' for a, c, p in zip(w, x, products, strict=True)), f"wᵀx = {' + '.join(map(fmt, products))} = {fmt(sum(products))}", f'z = {fmt(sum(products))} + ({fmt(b)}) = {fmt(z)}', f"{s['output']}(z) = {fmt(output)} → class {prediction}"],
        samples=GATES[s['gate']], correct=sum(hard(item['x']) == item['y'][0] for item in GATES[s['gate']]),
        boundary=grid(hard if s['output'] == 'step' else lambda inputs: activate(dot(w, inputs) + b, 'sigmoid')),
        hardBoundary=grid(hard, None if old is None else lambda inputs: int(dot(old[:2], inputs) + old[2] >= 0)),
        curves=[curve('Step', lambda v: int(v >= 0), z, (-10, 10)), curve('Sigmoid', lambda v: activate(v, 'sigmoid'), z, (-10, 10))])

def single_computation(network, inputs, labels, row, binary=False, decision='sigmoid'):
    trace = forward(network, inputs)
    scores = trace['z'][0][:2 if binary else 3]
    probabilities = softmax(scores)
    difference = scores[1] - scores[0]
    shifted = [x - max(scores) for x in scores]
    contributions = [[w * x for w, x in zip(weights, inputs, strict=True)] for weights in network[0]['weights']]
    return dict(input=inputs, trace=trace, scores=scores, probabilities=probabilities, labels=labels[:len(scores)], row=min(row, len(scores) - 1), winner=int(difference >= 0) if binary else probabilities.index(max(probabilities)), sums=[sum(values) for values in contributions], contributions=contributions, shifted=shifted, exponentials=[math.exp(x) for x in shifted], difference=difference, binaryOutput=int(difference >= 0) if decision == 'step' else activate(difference, 'sigmoid'))

def single_result(s):
    extracted = character_features(s['text'])
    return dict(numeric=single_computation(s['network'], s['input'], ['Class A', 'Class B', 'Class C'], s['row']), language=single_computation(s['languageNetwork'], extracted['features'], LANGUAGES, s['row'], s['languageMode'] == 'binary', s['decision']), counts=extracted['counts'], total=extracted['total'])

def mlp_computation(s, network):
    trace = forward(network, s['input'])
    l = min(s['selected']['layer'], len(network) - 1)
    row = min(s['selected']['row'], len(network[l]['biases']) - 1)
    selected = dict(layer=l, row=row, column=min(s['selected']['column'], len(network[l]['weights'][row]) - 1))
    z = trace['z'][l][row]
    predict = lambda inputs: forward(network, inputs)['a'][-1][0]
    predictions = [dict(**item, output=predict(item['x']), prediction=int(predict(item['x']) >= .5), correct=int(predict(item['x']) >= .5) == item['y'][0]) for item in GATES['XOR']]
    curves = lambda kind: [curve(kind, lambda x: activate(x, kind), z), curve('derivative', lambda x: derivative(x, kind), z)]
    return dict(network=network, trace=trace, selected=selected, z=z, boundary=grid(predict), predictions=predictions, correct=sum(p['correct'] for p in predictions), loss=batch_analysis(network, GATES['XOR'], 'Binary cross-entropy')['loss'], curves=curves(s['activation']), layerCurves=curves(network[l]['activation']), activations=[dict(name=kind, value=activate(z, kind), derivative=derivative(z, kind)) for kind in ACTIVATIONS])

def mlp_result(s):
    single = [dict(weights=[s['single'][:2]], biases=[s['single'][2]], activation='sigmoid')]
    return dict(single=mlp_computation(s, single), multi=mlp_computation(s, s['network']), dropped=dropout(s['dropoutValues'], s['mask'], s['dropoutP'], s['training']), scale=1 / (1 - s['dropoutP']), keep=1 - s['dropoutP'])

def training_result(s):
    network = s['network']
    analysis = analyze(network, s['input'], s['target'], s['loss'])
    samples = training_samples(s)
    batch = batch_analysis(network, samples, s['loss'])
    proposed = update_network(network, batch['gradients'], s['rate'])
    selected = s['selected']
    l, j, k = selected['layer'], selected['row'], selected['column']
    value = selected_value(network, selected)
    grad = selected_value(batch['gradients'], selected)
    probabilities = softmax(s['lossScores'])
    target = [int(i == s['lossClass']) for i in range(3)]
    categorical = s['explorerLoss'] == 'Categorical cross-entropy'
    binary = s['explorerLoss'] == 'Binary cross-entropy'
    explorer_value = loss_value(probabilities if categorical else [s['lossPrediction']], target if categorical else [s['lossTarget']], s['explorerLoss'])
    formula = f"(ŷ − y)² = ({fmt(s['lossPrediction'])} − {fmt(s['lossTarget'])})²" if s['explorerLoss'] == 'MSE' else f"|ŷ − y| = |{fmt(s['lossPrediction'])} − {fmt(s['lossTarget'])}|" if s['explorerLoss'] == 'MAE' else '−[y log(p) + (1 − y) log(1 − p)]' if binary else f"−Σ yⱼ log(pⱼ) = −log({fmt(probabilities[s['lossClass']])})"
    updates = []
    for li, layer in enumerate(network):
        for r, weights in enumerate(layer['weights']):
            for col in [*range(len(weights)), -1]:
                sel = dict(layer=li, row=r, column=col)
                old, g, new = selected_value(network, sel), selected_value(batch['gradients'], sel), selected_value(proposed, sel)
                updates.append(dict(name=f'b[{li}][{r}]' if col < 0 else f'W[{li}][{r}][{col}]', value=old, grad=g, change=-s['rate'] * g, proposed=new))
    return dict(analysis=analysis, batch=batch, proposed=proposed, afterLoss=batch_analysis(proposed, samples, s['loss'])['loss'], value=value, grad=grad, sampleGrad=selected_value(analysis['gradients'], selected), incoming=1 if k < 0 else analysis['a'][l][k], delta=analysis['deltas'][l][j], derivative=derivative(analysis['z'][l][j], network[l]['activation']), paths=[] if l == len(network) - 1 else [row[j] * analysis['deltas'][l + 1][r] for r, row in enumerate(network[l + 1]['weights'])], updatedValue=selected_value(proposed, selected), updates=updates, probabilities=probabilities, target=target, contributions=[-y * math.log(probability) if probability else 0 for probability, y in zip(probabilities, target, strict=True)], explorerValue=explorer_value, formula=formula, curves=[curve(s['explorerLoss'], lambda x: -math.log(x) if categorical else loss_value([x], [s['lossTarget']], s['explorerLoss']), probabilities[s['lossClass']] if categorical else s['lossPrediction'], (.001, .999) if binary or categorical else (-2, 2))])

def run_lab(lab, request):
    s = initial(lab) if request.state is None or request.command.action == 'reset' else request.state.model_dump()
    # Architecture and mask commands replace those fields before validating their new shapes.
    if request.command.action not in ('architecture', 'mask', 'reset'): validate_state(lab, s)
    perform(lab, s, request.command)
    s = DATA_MODELS[lab].model_validate(s).model_dump()
    validate_state(lab, s)
    result = dict(perceptron=perceptron_result, single_layer=single_result, mlp=mlp_result, training=training_result)[lab](s)
    return dict(state=s, result=result)
