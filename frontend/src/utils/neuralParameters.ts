import type { ParameterSelection } from "@/types/neuralNetworks";

export function parameterName(s: ParameterSelection) {
    return s.column < 0 ? `b[${s.layer}][${s.row}]` : `W[${s.layer}][${s.row}][${s.column}]`;
}
