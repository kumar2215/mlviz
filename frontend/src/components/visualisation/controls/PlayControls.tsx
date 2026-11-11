import { playbackGradient } from "@/theme/recipes";
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
                        ? `${buttonStyle} bg-primary-pressed`
                        : currentStep >= maxSteps
                        ? `${buttonStyle} bg-primary`
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
                        className="w-full h-1 bg-surface-hover rounded-lg appearance-none cursor-pointer hover:bg-disabled
                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                                   [&::-webkit-slider-thumb]:bg-success-strong [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                                   [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-primary
                                   [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
                        style={{
                            background: playbackGradient(maxSteps > 0 ? currentStep / maxSteps * 100 : 0),
                        }}
                        title={`Step: ${currentStep}/${maxSteps}`}
                    />
                </div>
            )}

            {/* Step Display */}
            {compact || (
                <span className="text-xs font-medium text-text-secondary min-w-0">
                    {currentStep}/{maxSteps}
                </span>
            )}
        </div>
    );
};

export default PlayControls;
