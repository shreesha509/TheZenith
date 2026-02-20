import React, { useRef, useEffect } from 'react';

/* 
  CyberFlow Background
  A high-tech grid with flowing data pulses and a rhythmic "scanning" beam.
  Perfectly suited for a CI/CD Healing Agent project.
*/

const CyberFlow = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        let width, height;
        let gridLines = [];
        let pulses = [];
        let scanLineY = 0;

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            scanLineY = 0;
        };

        window.addEventListener('resize', resize);
        resize();

        // Initialize grid pulses
        const createPulse = () => {
            if (pulses.length > 50) return;
            const isHorizontal = Math.random() > 0.5;
            const position = isHorizontal
                ? Math.floor(Math.random() * (height / 60)) * 60
                : Math.floor(Math.random() * (width / 60)) * 60;

            pulses.push({
                x: isHorizontal ? -100 : position,
                y: isHorizontal ? position : -100,
                speed: 2 + Math.random() * 6,
                size: 40 + Math.random() * 80,
                isHorizontal,
                color: Math.random() > 0.5 ? '#34d399' : '#10b981'
            });
        };

        const drawGrid = () => {
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.05)';
            ctx.lineWidth = 1;

            // Vertical lines
            for (let x = 0; x < width; x += 60) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }

            // Horizontal lines
            for (let y = 0; y < height; y += 60) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        };

        const drawPulses = () => {
            pulses.forEach((pulse, index) => {
                const gradient = pulse.isHorizontal
                    ? ctx.createLinearGradient(pulse.x, pulse.y, pulse.x + pulse.size, pulse.y)
                    : ctx.createLinearGradient(pulse.x, pulse.y, pulse.x, pulse.y + pulse.size);

                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(0.5, pulse.color);
                gradient.addColorStop(1, 'transparent');

                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.beginPath();

                if (pulse.isHorizontal) {
                    ctx.moveTo(pulse.x, pulse.y);
                    ctx.lineTo(pulse.x + pulse.size, pulse.y);
                    pulse.x += pulse.speed;
                } else {
                    ctx.moveTo(pulse.x, pulse.y);
                    ctx.lineTo(pulse.x, pulse.y + pulse.size);
                    pulse.y += pulse.speed;
                }

                ctx.stroke();

                // Clean up off-screen pulses
                if (pulse.x > width + 100 || pulse.y > height + 100) {
                    pulses.splice(index, 1);
                }
            });
        };

        const drawScanLine = () => {
            scanLineY += 1.5;
            if (scanLineY > height) scanLineY = -100;

            const gradient = ctx.createLinearGradient(0, scanLineY, 0, scanLineY + 100);
            gradient.addColorStop(0, 'rgba(52, 211, 153, 0)');
            gradient.addColorStop(0.5, 'rgba(52, 211, 153, 0.08)');
            gradient.addColorStop(1, 'rgba(52, 211, 153, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, scanLineY, width, 100);

            // Bright edge of scan-line
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, scanLineY + 100);
            ctx.lineTo(width, scanLineY + 100);
            ctx.stroke();
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            drawGrid();
            drawPulses();
            drawScanLine();

            if (Math.random() > 0.9) createPulse();

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
                pointerEvents: 'none',
                opacity: 0.8
            }}
        />
    );
};

export default CyberFlow;
