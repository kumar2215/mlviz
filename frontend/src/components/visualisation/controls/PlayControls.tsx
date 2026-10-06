// Reusable play/pause/step controls component

import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw } from "lucide-react";
import React from "react";
import type { PlayControlState } from "../types";

interface PlayControlsProps {
    playControls: PlayControlState;
    showSlider?: boolean;
    compact?: boolean;
    className?: string;
    buttonStyle: string;
}

const PlayControls: React.FC<PlayControlsProps> = ({
    playControls,
    showSlider = true,
    compact = true,
    className = "",
    buttonStyle = "",
}) => {
    const {
        isPlaying,
        currentStep,
        maxSteps,
        startPlaying,
        stopPlaying,
        resetToStart,
        setCurrentStep,
    } = playControls;

    const handlePlayPause = () => {
        if (isPlaying) {
            stopPlaying();
        } else if (currentStep >= maxSteps) {
            resetToStart();
            setTimeout(() => startPlaying(), 50);
        } else {
            startPlaying();
        }
    };

    const handleSliderChange = (newStep: number) => {
        setCurrentStep(newStep);
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Button
                onClick={handlePlayPause}
                title={
                    isPlaying
                        ? "Pause"
                        : currentStep >= maxSteps
                        ? "Restart animation"
                        : "Play"
                }
                className={
                    isPlaying
                        ? `${buttonStyle} !bg-gradient-to-r !from-teal-500 !to-emerald-600`
                        : currentStep >= maxSteps
                        ? `${buttonStyle} !bg-gradient-to-r !from-red-500 !to-orange-600`
                        : `${buttonStyle}`
                }
            >
                {isPlaying ? (
                    <Pause />
                ) : currentStep >= maxSteps ? (
                    <RotateCcw />
                ) : (
                    <Play />
                )}
            </Button>

            {/* Compact Slider */}
            {showSlider && (
                <div className="relative w-16">
                    <input
                        type="range"
                        min="0"
                        max={maxSteps}
                        value={currentStep}
                        onChange={(e) =>
                            handleSliderChange(parseInt(e.target.value))
                        }
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer hover:bg-gray-300
                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                                   [&::-webkit-slider-thumb]:bg-emerald-700 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                                   [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-blue-500 
                                   [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
                        style={{
                            background: `linear-gradient(to right, oklch(69.6% 0.17 162.48) 0%, oklch(50.8% 0.118 165.612) ${
                                maxSteps > 0
                                    ? (currentStep / maxSteps) * 100
                                    : 0
                            }%, oklch(70.7% 0.022 261.325) ${
                                maxSteps > 0
                                    ? (currentStep / maxSteps) * 100
                                    : 0
                            }%, oklch(55.1% 0.027 264.364) 100%)`,
                        }}
                        title={`Step: ${currentStep}/${maxSteps}`}
                    />
                </div>
            )}

            {/* Step Display */}
            {compact || (
                <span className="text-xs font-medium text-gray-600 min-w-0">
                    {currentStep}/{maxSteps}
                </span>
            )}
        </div>
    );
};

export default PlayControls;
