"""Explicit small-network arithmetic shared by the neural-network labs."""
import math
import random
from copy import deepcopy

ACTIVATIONS = ['sigmoid', 'tanh', 'hard tanh', 'ReLU', 'linear']
LOSSES = ['MSE', 'MAE', 'Binary cross-entropy', 'Categorical cross-entropy']
GATES = {name: [{'x': x, 'y': [int(all(x) if name == 'AND' else any(x) if name == 'OR' else x[0] != x[1])]} for x in [[0, 0], [0, 1], [1, 0], [1, 1]]] for name in ['AND', 'OR', 'XOR']}
SOLVED_XOR = [dict(weights=[[8, 8], [8, 8]], biases=[-4, -12], activation='tanh'), dict(weights=[[8, -8]], biases=[-8], activation='sigmoid')]

def dot(a, b):
    return sum(x * y for x, y in zip(a, b, strict=True))

def activate(x, kind):
    if kind == 'sigmoid':
        return 1 / (1 + math.exp(-x)) if x >= 0 else math.exp(x) / (1 + math.exp(x))
    if kind == 'tanh': return math.tanh(x)
    if kind == 'hard tanh': return max(-1, min(1, x))
    if kind == 'ReLU': return max(0, x)
    return x

def derivative(x, kind):
    if kind == 'sigmoid':
        a = activate(x, kind)
        return a * (1 - a)
    if kind == 'tanh': return 1 - math.tanh(x) ** 2
    if kind == 'hard tanh': return int(abs(x) < 1)
    if kind == 'ReLU': return int(x > 0)
    return 1

def softmax(values):
    maximum = max(values)
    exp = [math.exp(x - maximum) for x in values]
    return [x / sum(exp) for x in exp]

def forward(network, inputs):
    a, z = [list(inputs)], []
    for layer in network:
        values = [dot(row, a[-1]) + b for row, b in zip(layer['weights'], layer['biases'], strict=True)]
        z.append(values)
        a.append(softmax(values) if layer['activation'] == 'softmax' else [activate(x, layer['activation']) for x in values])
    return dict(a=a, z=z)

def probability(x): return max(1e-12, min(1 - 1e-12, x))

def loss_value(prediction, target, kind):
    n = len(prediction)
    if kind == 'MSE': return sum((p - y) ** 2 for p, y in zip(prediction, target, strict=True)) / n
    if kind == 'MAE': return sum(abs(p - y) for p, y in zip(prediction, target, strict=True)) / n
    if kind == 'Binary cross-entropy': return -sum(y * math.log(probability(p)) + (1 - y) * math.log(1 - probability(p)) for p, y in zip(prediction, target, strict=True)) / n
    return -sum(y * math.log(probability(p)) for p, y in zip(prediction, target, strict=True))

def activation_backward(upstream, z, kind, a):
    if kind == 'softmax':
        projection = dot(upstream, a)
        return [value * (upstream[i] - projection) for i, value in enumerate(a)]
    return [u * derivative(value, kind) for u, value in zip(upstream, z, strict=True)]

def analyze(network, inputs, target, kind):
    trace = forward(network, inputs)
    output = trace['a'][-1]
    n = len(output)
    if len(target) != n: raise ValueError('Target width must match the output width.')
    loss = loss_value(output, target, kind)
    if kind == 'Binary cross-entropy' and network[-1]['activation'] == 'sigmoid':
        loss = sum((max(0, z) - z * y + math.log1p(math.exp(-abs(z)))) for z, y in zip(trace['z'][-1], target, strict=True)) / n
        delta = [(a - y) / n for a, y in zip(output, target, strict=True)]
    elif kind == 'Categorical cross-entropy' and network[-1]['activation'] == 'softmax':
        z = trace['z'][-1]
        maximum = max(z)
        log_sum = maximum + math.log(sum(math.exp(x - maximum) for x in z))
        loss = sum(y * (log_sum - x) for x, y in zip(z, target, strict=True))
        delta = [a * sum(target) - y for a, y in zip(output, target, strict=True)]
    else:
        upstream = [2 * (a - y) / n if kind == 'MSE' else (int(a > y) - int(a < y)) / n if kind == 'MAE' else (probability(a) - y) / (probability(a) * (1 - probability(a)) * n) if kind == 'Binary cross-entropy' else -y / probability(a) for a, y in zip(output, target, strict=True)]
        delta = activation_backward(upstream, trace['z'][-1], network[-1]['activation'], output)
    gradients, deltas = [None] * len(network), [None] * len(network)
    for l in reversed(range(len(network))):
        deltas[l] = delta
        gradients[l] = dict(weights=[[d * a for a in trace['a'][l]] for d in delta], biases=list(delta))
        if l > 0:
            upstream = [sum(row[k] * delta[j] for j, row in enumerate(network[l]['weights'])) for k in range(len(trace['a'][l]))]
            delta = activation_backward(upstream, trace['z'][l - 1], network[l - 1]['activation'], trace['a'][l])
    return dict(**trace, loss=loss, gradients=gradients, deltas=deltas)

def batch_analysis(network, samples, kind):
    analyses = [analyze(network, item['x'], item['y'], kind) for item in samples]
    n = len(analyses)
    return dict(loss=sum(a['loss'] for a in analyses) / n, gradients=[dict(
        weights=[[sum(a['gradients'][l]['weights'][j][k] for a in analyses) / n for k in range(len(row))] for j, row in enumerate(layer['weights'])],
        biases=[sum(a['gradients'][l]['biases'][j] for a in analyses) / n for j in range(len(layer['biases']))]) for l, layer in enumerate(network)])

def update_network(network, gradients, rate):
    return [dict(activation=layer['activation'], weights=[[w - rate * gradients[l]['weights'][j][k] for k, w in enumerate(row)] for j, row in enumerate(layer['weights'])], biases=[b - rate * gradients[l]['biases'][j] for j, b in enumerate(layer['biases'])]) for l, layer in enumerate(network)]

def initialize(sizes, activation, seed, output='sigmoid'):
    rng = random.Random(seed)
    return [dict(weights=[[rng.uniform(-1, 1) * math.sqrt(6 / (sizes[l] + size)) for _ in range(sizes[l])] for _ in range(size)], biases=[0] * size, activation=output if l == len(sizes) - 2 else activation) for l, size in enumerate(sizes[1:])]

def make_mask(rows, columns, p, seed, shared):
    rng = random.Random(seed)
    row = [int(rng.random() >= p) for _ in range(columns)]
    return [list(row) if i == 0 or shared else [int(rng.random() >= p) for _ in range(columns)] for i in range(rows)]

def dropout(values, mask, p, training):
    return [[a * mask[i][j] / (1 - p) if training else a for j, a in enumerate(row)] for i, row in enumerate(values)]

def edit_parameter(network, selected, value):
    result = deepcopy(network)
    l, j, k = selected['layer'], selected['row'], selected['column']
    if l >= len(result) or j >= len(result[l]['biases']) or k >= len(result[l]['weights'][j]):
        raise ValueError('The selected parameter is outside the network.')
    if k < 0: result[l]['biases'][j] = value
    else: result[l]['weights'][j][k] = value
    return result

def selected_value(network, selected):
    layer = network[selected['layer']]
    return layer['biases'][selected['row']] if selected['column'] < 0 else layer['weights'][selected['row']][selected['column']]

def fmt(x):
    return f'{x:.2e}' if abs(x) > 9999 or 0 < abs(x) < .0001 else f'{x:.4f}'.rstrip('0').rstrip('.') if x else '0'

def curve(name, evaluate, marker=None, domain=(-5, 5)):
    return dict(name=name, points=[[x, evaluate(x)] for x in [domain[0] + i / 160 * (domain[1] - domain[0]) for i in range(161)]], marker=None if marker is None else [marker, evaluate(marker)])

def grid(predict, old=None):
    n = 40
    points = [[-.5 + (i % n + .5) * 2 / n, 1.5 - (i // n + .5) * 2 / n] for i in range(n * n)]
    return dict(n=n, values=[predict(x) for x in points], oldValues=None if old is None else [old(x) for x in points])
