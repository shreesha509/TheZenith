import React, { useEffect, useState } from 'react';

const CHARS = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>[]{}/\\|!@#$%^&*()_+=-';
const WORDS = ['FIX', 'HEAL', 'ZENITH', 'CODE', 'REPOS', 'CI', 'CD', 'GIT', 'DIFF', 'AGENT', 'FLOW', 'RUN'];

const CodeRain = () => {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const generateParticles = () => {
            const newParticles = [];
            const count = 60;

            for (let i = 0; i < count; i++) {
                const isWord = Math.random() > 0.8;
                const text = isWord
                    ? WORDS[Math.floor(Math.random() * WORDS.length)]
                    : Array.from({ length: Math.floor(4 + Math.random() * 6) }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

                // Natural parallax & Blur logic
                const depth = Math.random(); // 0 is far, 1 is close
                const blur = (1 - depth) * 4;
                const fontSize = 10 + depth * 14; // 10px to 24px
                const duration = 18 - depth * 12; // Further is slower
                const opacity = 0.05 + depth * 0.25;

                newParticles.push({
                    id: i,
                    text,
                    left: `${(i / count) * 100}%`,
                    duration,
                    delay: Math.random() * -20,
                    fontSize,
                    opacity,
                    blur,
                    zIndex: Math.floor(depth * 5)
                });
            }
            setParticles(newParticles);
        };

        generateParticles();
    }, []);

    return (
        <div className="code-rain-container" style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 1
        }}>
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="code-particle"
                    style={{
                        position: 'absolute',
                        left: p.left,
                        top: '-20%',
                        fontSize: `${p.fontSize}px`,
                        color: 'var(--emerald)',
                        opacity: p.opacity,
                        filter: `blur(${p.blur}px)`,
                        fontFamily: 'var(--font-mono)',
                        whiteSpace: 'nowrap',
                        animation: `codeFall ${p.duration}s linear infinite`,
                        animationDelay: `${p.delay}s`,
                        writingMode: 'vertical-rl',
                        textOrientation: 'upright',
                        letterSpacing: '2px',
                        zIndex: p.zIndex,
                        textShadow: p.blur < 1 ? '0 0 8px var(--emerald)' : 'none'
                    }}
                >
                    {p.text}
                </div>
            ))}
            <style>{`
                @keyframes codeFall {
                    0% {
                        transform: translateY(0);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    90% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(120vh);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default CodeRain;
