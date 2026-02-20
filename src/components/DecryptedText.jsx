import React, { useState, useEffect, useRef } from 'react';

/**
 * DecryptedText Component
 * Inspired by reactbits.dev
 * 
 * @param {string} text - The text to be decrypted
 * @param {number} speed - The speed of the animation (ms per character reveal)
 * @param {number} maxIterations - Number of random shuffles per character
 * @param {boolean} sequential - Whether to reveal characters one by one
 * @param {boolean} animateOnHover - Trigger animation on hover
 */
const DecryptedText = ({
    text,
    speed = 60,
    maxIterations = 10,
    sequential = true,
    animateOnHover = false,
    className = ""
}) => {
    const [displayText, setDisplayText] = useState("");
    const [isHovering, setIsHovering] = useState(false);
    const intervalRef = useRef(null);

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

    const triggerAnimation = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        let iteration = 0;
        const splitText = text.split("");

        intervalRef.current = setInterval(() => {
            const newText = splitText.map((char, index) => {
                if (char === " ") return " ";

                // Sequential reveal logic
                if (sequential) {
                    if (index < iteration / maxIterations) {
                        return text[index];
                    }
                } else {
                    // Simultaneous reveal logic
                    if (iteration >= maxIterations) {
                        return text[index];
                    }
                }

                return characters[Math.floor(Math.random() * characters.length)];
            }).join("");

            setDisplayText(newText);

            iteration++;

            const isFinished = sequential
                ? iteration >= text.length * maxIterations
                : iteration >= maxIterations;

            if (isFinished) {
                setDisplayText(text);
                clearInterval(intervalRef.current);
            }
        }, speed);
    };

    useEffect(() => {
        if (!animateOnHover) {
            triggerAnimation();
        }
        return () => clearInterval(intervalRef.current);
    }, [text]);

    const handleMouseEnter = () => {
        if (animateOnHover) {
            setIsHovering(true);
            triggerAnimation();
        }
    };

    return (
        <span
            className={className}
            onMouseEnter={handleMouseEnter}
            style={{
                whiteSpace: 'pre-wrap'
            }}
        >
            {displayText || text}
        </span>
    );
};

export default DecryptedText;
