"""Validated contracts for the small, stateless neural-network laboratories."""
from typing import Annotated, Generic, Literal, TypeVar
from pydantic import BaseModel, ConfigDict, Field, model_validator

Activation = Literal['linear', 'sigmoid', 'tanh', 'hard tanh', 'ReLU', 'softmax']
Loss = Literal['MSE', 'MAE', 'Binary cross-entropy', 'Categorical cross-entropy']
Number = Annotated[float, Field(allow_inf_nan=False, ge=-1e8, le=1e8)]
Vector = Annotated[list[Number], Field(min_length=1, max_length=40)]
Matrix = Annotated[list[Vector], Field(min_length=1, max_length=40)]

class Contract(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)

class NeuralLayer(Contract):
    weights: Matrix
    biases: Vector
    activation: Activation

    @model_validator(mode='after')
    def shape(self):
        if len(self.weights) != len(self.biases) or len({len(row) for row in self.weights}) != 1:
            raise ValueError('Weights must be rectangular, with one bias per output neuron.')
        return self

Network = Annotated[list[NeuralLayer], Field(min_length=1, max_length=4)]

class ParameterSelection(Contract):
    layer: int = Field(ge=0, le=3)
    row: int = Field(ge=0, le=39)
    column: int = Field(ge=-1, le=39)

class PerceptronUpdate(Contract):
    iteration: int
    x: list[float]
    target: float
    prediction: int
    error: float
    before: list[float]
    after: list[float]
    rate: float

class PerceptronData(Contract):
    network: Network
    input: Vector
    target: Number
    output: Literal['step', 'sigmoid']
    threshold: float = Field(gt=0, lt=1)
    phase: int = Field(ge=0, le=4)
    seed: int
    rate: float = Field(ge=0.001, le=3)
    gate: Literal['AND', 'OR', 'XOR']
    sample: int = Field(ge=0, le=3)
    custom: bool
    playing: bool
    history: list[PerceptronUpdate] = Field(max_length=1000)

class SingleLayerData(Contract):
    network: Network
    languageNetwork: Network
    input: Vector
    row: int = Field(ge=0, le=2)
    phase: int = Field(ge=0, le=3)
    seed: int
    text: str = Field(max_length=10000)
    languageMode: Literal['binary', 'multi']
    decision: Literal['step', 'sigmoid']
    feature: int = Field(ge=0, le=34)

class MlpData(Contract):
    network: Network
    input: Vector
    seed: int
    hidden: Annotated[list[Annotated[int, Field(ge=2, le=4)]], Field(min_length=1, max_length=3)]
    activation: Activation
    selected: ParameterSelection
    forwardPhase: int = Field(ge=0, le=3)
    xorMode: Literal['single', 'linear', 'nonlinear']
    single: Vector
    rate: float = Field(ge=0.001, le=3)
    history: list[Number] = Field(max_length=1000)
    playing: bool
    dropoutP: float = Field(ge=0, le=0.9)
    mask: Matrix
    dropoutValues: Matrix
    dropoutVariant: Literal['element', 'feature']
    training: bool
    maskSeed: int
    message: str

class TrainingData(Contract):
    network: Network
    seed: int
    input: Vector
    target: Vector
    loss: Literal['MSE', 'MAE', 'Binary cross-entropy']
    rate: float = Field(ge=0.001, le=3)
    phase: int = Field(ge=0, le=3)
    selected: ParameterSelection
    batch: bool
    history: list[Number] = Field(max_length=1001)
    playing: bool
    message: str
    explorerLoss: Loss
    lossPrediction: Number
    lossTarget: Number
    lossClass: int = Field(ge=0, le=2)
    lossScores: Vector

class NeuralCommand(Contract):
    action: Literal['evaluate', 'reset', 'initialize', 'learn', 'train', 'apply', 'architecture', 'solution', 'mask', 'toggle', 'parameter', 'sample', 'score', 'shift'] = 'evaluate'
    selection: ParameterSelection | None = None
    value: Number = 0
    index: int = Field(default=0, ge=0, le=39)
    language: bool = False

T = TypeVar('T')
class LabRequest(Contract, Generic[T]):
    state: T | None = None
    command: NeuralCommand = Field(default_factory=NeuralCommand)

class PerceptronRequest(LabRequest[PerceptronData]): pass
class SingleLayerRequest(LabRequest[SingleLayerData]): pass
class MlpRequest(LabRequest[MlpData]): pass
class TrainingRequest(LabRequest[TrainingData]): pass

class NeuralTrace(Contract):
    a: list[list[float]]
    z: list[list[float]]

class NeuralGradient(Contract):
    weights: list[list[float]]
    biases: list[float]

class NeuralAnalysis(NeuralTrace):
    loss: float
    gradients: list[NeuralGradient]
    deltas: list[list[float]]

class NeuralObjective(Contract):
    loss: float
    gradients: list[NeuralGradient]

class NeuralSample(Contract):
    x: list[float]
    y: list[float]

class NeuralCurve(Contract):
    name: str
    points: list[list[float]]
    marker: list[float] | None = None

class NeuralGrid(Contract):
    values: list[float]
    oldValues: list[float] | None = None
    n: int

class PerceptronResult(Contract):
    z: float
    output: float
    prediction: int
    step: int
    sigmoid: float
    equations: list[str]
    samples: list[NeuralSample]
    correct: int
    boundary: NeuralGrid
    hardBoundary: NeuralGrid
    curves: list[NeuralCurve]

class SingleComputation(Contract):
    input: list[float]
    trace: NeuralTrace
    scores: list[float]
    probabilities: list[float]
    labels: list[str]
    row: int
    winner: int
    sums: list[float]
    contributions: list[list[float]]
    shifted: list[float]
    exponentials: list[float]
    difference: float
    binaryOutput: float

class SingleLayerResult(Contract):
    numeric: SingleComputation
    language: SingleComputation
    counts: list[int]
    total: int

class ActivationValue(Contract):
    name: Activation
    value: float
    derivative: float

class NeuralPrediction(NeuralSample):
    output: float
    prediction: int
    correct: bool

class MlpComputation(Contract):
    network: Network
    trace: NeuralTrace
    selected: ParameterSelection
    z: float
    boundary: NeuralGrid
    predictions: list[NeuralPrediction]
    correct: int
    loss: float
    curves: list[NeuralCurve]
    layerCurves: list[NeuralCurve]
    activations: list[ActivationValue]

class MlpResult(Contract):
    single: MlpComputation
    multi: MlpComputation
    dropped: list[list[float]]
    scale: float
    keep: float

class ParameterUpdate(Contract):
    name: str
    value: float
    grad: float
    change: float
    proposed: float

class TrainingResult(Contract):
    analysis: NeuralAnalysis
    batch: NeuralObjective
    proposed: Network
    afterLoss: float
    value: float
    grad: float
    sampleGrad: float
    incoming: float
    delta: float
    derivative: float
    paths: list[float]
    updatedValue: float
    updates: list[ParameterUpdate]
    probabilities: list[float]
    target: list[float]
    contributions: list[float]
    explorerValue: float
    formula: str
    curves: list[NeuralCurve]

class PerceptronResponse(Contract):
    state: PerceptronData
    result: PerceptronResult

class SingleLayerResponse(Contract):
    state: SingleLayerData
    result: SingleLayerResult

class MlpResponse(Contract):
    state: MlpData
    result: MlpResult

class TrainingResponse(Contract):
    state: TrainingData
    result: TrainingResult
