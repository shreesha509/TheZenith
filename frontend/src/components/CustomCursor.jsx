import React, { useEffect, useState, useRef } from 'react';

/* 
  CustomCursor - Nova Pulse Design
  Highly visible, high-contrast cursor with an interactive pulsing aura
  and a precise targeting core.
*/

const CustomCursor = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const trailRef = useRef({ x: 0, y: 0 });
    const requestRef = useRef();

    useEffect(() => {
        const onMouseMove = (e) => {
            setPosition({ x: e.clientX, y: e.clientY });
            setIsVisible(true);
        };

        const onMouseDown = () => setIsHovering(true);
        const onMouseUp = () => setIsHovering(false);

        const onMouseOver = (e) => {
            if (e.target.tagName === 'BUTTON' ||
                e.target.tagName === 'A' ||
                e.target.closest('button') ||
                e.target.closest('a') ||
                e.target.classList.contains('interactive')) {
                setIsHovering(true);
            }
        };

        const onMouseOut = () => setIsHovering(false);

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('mouseover', onMouseOver);
        window.addEventListener('mouseout', onMouseOut);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('mouseover', onMouseOver);
            window.removeEventListener('mouseout', onMouseOut);
        };
    }, []);

    const animateTrail = () => {
        const easedX = trailRef.current.x + (position.x - trailRef.current.x) * 0.18;
        const easedY = trailRef.current.y + (position.y - trailRef.current.y) * 0.18;

        trailRef.current = { x: easedX, y: easedY };

        const aura = document.getElementById('cursor-aura');
        if (aura) {
            aura.style.transform = `translate(${easedX}px, ${easedY}px) scale(${isHovering ? 1.4 : 1})`;
        }

        requestRef.current = requestAnimationFrame(animateTrail);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animateTrail);
        return () => cancelAnimationFrame(requestRef.current);
    }, [position, isHovering]);

    if (!isVisible) return null;

    return (
        <>
            {/* High-Visibility Core */}
            <div
                id="cursor-dot-v3"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#fff', // White core for maximum contrast
                    borderRadius: '50%',
                    zIndex: 10001,
                    pointerEvents: 'none',
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    boxShadow: '0 0 20px #c084fc, 0 0 10px #8b5cf6',
                    marginTop: '-6px',
                    marginLeft: '-6px',
                    transition: 'transform 0.05s linear'
                }}
            />

            {/* The Pulsing Nova Aura */}
            <div
                id="cursor-aura"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '50px',
                    height: '50px',
                    border: '3px solid rgba(192, 132, 252, 0.4)',
                    borderRadius: '50%',
                    zIndex: 10000,
                    pointerEvents: 'none',
                    marginTop: '-25px',
                    marginLeft: '-25px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'cursorPulse 2s infinite ease-in-out'
                }}
            >
                {/* Horizontal & Vertical Crosshairs */}
                <div style={{ position: 'absolute', width: '2px', height: '14px', background: '#c084fc', top: -10 }} />
                <div style={{ position: 'absolute', width: '2px', height: '14px', background: '#c084fc', bottom: -10 }} />
                <div style={{ position: 'absolute', width: '14px', height: '2px', background: '#c084fc', left: -10 }} />
                <div style={{ position: 'absolute', width: '14px', height: '2px', background: '#c084fc', right: -10 }} />
            </div>

            <style>{`
                @keyframes cursorPulse {
                    0% { transform: scale(1) translate(0, 0); border-width: 3px; opacity: 0.4; }
                    50% { transform: scale(1.1) translate(0, 0); border-width: 1px; opacity: 0.8; }
                    100% { transform: scale(1) translate(0, 0); border-width: 3px; opacity: 0.4; }
                }
                body, html, * {
                    cursor: none !important;
                }
            `}</style>
        </>
    );
};

export default CustomCursor;
