import React, { useRef, useEffect } from 'react';

const NeuralNexus = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        let width, height;
        let nodes = [];
        const nodeCount = 120; // Increased density
        const connectionDistance = 200; // Longer connections
        const mouseRadius = 250;
        let mouse = { x: null, y: null };

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            init();
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });

        class Node {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = (Math.random() - 0.5) * 0.4;
                this.radius = Math.random() * 2.5 + 1.5; // Slightly larger nodes
                this.pulse = Math.random() * Math.PI;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.pulse += 0.03; // Faster pulse

                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;

                // Mouse push effect
                if (mouse.x && mouse.y) {
                    const dx = this.x - mouse.x;
                    const dy = this.y - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < mouseRadius) {
                        const force = (mouseRadius - dist) / mouseRadius;
                        this.vx += (dx / dist) * force * 0.1; // Smooth push
                        this.vy += (dy / dist) * force * 0.1;
                    }
                }

                // Friction
                this.vx *= 0.99;
                this.vy *= 0.99;
            }

            draw() {
                const alpha = 0.3 + Math.abs(Math.sin(this.pulse)) * 0.5; // Brighter nodes
                ctx.fillStyle = `rgba(167, 139, 250, ${alpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // Constant inner glow for all nodes
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#a78bfa';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        const init = () => {
            nodes = [];
            for (let i = 0; i < nodeCount; i++) {
                nodes.push(new Node());
            }
        };

        const drawConnections = () => {
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDistance) {
                        const alpha = (1 - dist / connectionDistance) * 0.45; // Brighter connections
                        ctx.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
                        ctx.lineWidth = 1.2;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, width, height);

            // Much stronger mouse-following radial glow
            if (mouse.x && mouse.y) {
                const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 600);
                gradient.addColorStop(0, 'rgba(167, 139, 250, 0.12)'); // Boosted intensity
                gradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.04)');
                gradient.addColorStop(1, 'rgba(5, 5, 5, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
            }

            drawConnections();

            nodes.forEach(node => {
                node.update();
                node.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        resize();
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
                pointerEvents: 'none'
            }}
        />
    );
};

export default NeuralNexus;
