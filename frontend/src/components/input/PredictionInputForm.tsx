import React, { useEffect, useState } from "react";

interface PredictionInputFormProps {
    features: string[];
    initialPoints: Record<string, number>;
    onPredict: (newPoints: Record<string, number>) => void;
}

const PredictionInputForm: React.FC<PredictionInputFormProps> = ({
    features,
    initialPoints,
    onPredict,
}) => {
    const [formPoints, setFormPoints] =
        useState<Record<string, number>>(initialPoints);

    useEffect(() => {
        setFormPoints((formPoints) => {
            const initialKeys = Object.keys(initialPoints);
            const formKeys = Object.keys(formPoints);

            const featureSetsDifferent =
                initialKeys.length !== formKeys.length ||
                initialKeys.some((key) => !formKeys.includes(key));

            const valuesChanged = initialKeys.some(
                (key) => initialPoints[key] !== formPoints[key]
            );

            return featureSetsDifferent || valuesChanged ? initialPoints : formPoints;
        });
    }, [initialPoints]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newValue = parseFloat(value);

        setFormPoints((prevPoints) => ({
            ...prevPoints,
            [name]: isNaN(newValue) ? 0 : newValue,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onPredict(formPoints);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="p-4"
        >
            <div className="space-y-3">
                {features.length === 0 && (
                    <p className="text-gray-500 text-sm">
                        No features available for prediction inputs.
                    </p>
                )}
                {features.map((featureName) => (
                    <div
                        key={featureName}
                        className="flex flex-col"
                    >
                        <label
                            htmlFor={`input-${featureName}`}
                            className="text-xs font-medium text-gray-600 mb-1"
                        >
                            {featureName}
                        </label>
                        <input
                            type="number"
                            id={`input-${featureName}`}
                            name={featureName}
                            value={formPoints[featureName] ?? ""}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 bg-gray-50 font-mono rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            step="any"
                        />
                    </div>
                ))}
            </div>
            <div>
                <button
                    type="submit"
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-gray-700 font-medium rounded-md shadow-sm transition duration-100 hover:shadow-xl my-2"
                >
                    Predict
                </button>
            </div>
        </form>
    );
};

export default PredictionInputForm;
