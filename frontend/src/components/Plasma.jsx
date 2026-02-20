import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

/* 
  ReactBits Plasma Component (Refined)
  Maintains the website's theme and provides a high-performance background.
*/

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0.20, 0.83, 0.60]; // Default Emerald
    return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ];
};

const vertex = `#version 300 es
precision highp float;
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uSpeed;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;
out vec4 fragColor;

void mainImage(out vec4 o, vec2 C) {
    vec2 center = iResolution.xy * 0.5;
    C = (C - center) / uScale + center;
    
    vec2 mouseOffset = (uMouse - center) * 0.0002;
    C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);
    
    float i = 0.0;
    float d, z, T = iTime * uSpeed;
    vec3 O = vec3(0.0);
    vec3 p, S;

    for (vec2 r = iResolution.xy; ++i < 60.; O += o.w/d*o.xyz) {
        p = z * normalize(vec3(C - 0.5 * r, r.y)); 
        p.z -= 4.0; 
        S = p;
        d = p.y - T;
        
        p.x += 0.4 * (1.0 + p.y) * sin(d + p.x * 0.1) * cos(0.34 * d + p.x * 0.05); 
        vec2 Q = p.xz *= mat2(cos(p.y + vec4(0, 11, 33, 0) - T)); 
        z += d = abs(sqrt(length(Q * Q)) - 0.25 * (5.0 + S.y)) / 3.0 + 8e-4; 
        o = 1.0 + sin(S.y + p.z * 0.5 + S.z - length(S - p) + vec4(2, 1, 0, 8));
    }
    
    o.xyz = tanh(O / 1e4);
}

void main() {
    vec4 o = vec4(0.0);
    mainImage(o, gl_FragCoord.xy);
    vec3 rgb = o.rgb;
    
    // Theme balancing: blending the plasma's natural colors with our custom theme emerald
    float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
    vec3 themedColor = mix(rgb, uCustomColor * intensity * 2.5, 0.7);
    
    // Apply opacity and ensure deep blacks for the "behind text" look
    float alpha = length(themedColor) * uOpacity;
    fragColor = vec4(themedColor, alpha);
}
`;

export const Plasma = ({
    color = '#34d399',
    speed = 0.5,
    scale = 1.0,
    opacity = 0.8,
    mouseInteractive = true
}) => {
    const containerRef = useRef(null);
    const mousePos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const customColorRgb = hexToRgb(color);

        const renderer = new Renderer({
            webgl: 2,
            alpha: true,
            antialias: true,
            dpr: Math.min(window.devicePixelRatio || 1, 2)
        });
        const gl = renderer.gl;
        const canvas = gl.canvas;
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        containerRef.current.appendChild(canvas);

        const geometry = new Triangle(gl);
        const program = new Program(gl, {
            vertex,
            fragment,
            uniforms: {
                iTime: { value: 0 },
                iResolution: { value: new Float32Array([1, 1]) },
                uCustomColor: { value: new Float32Array(customColorRgb) },
                uSpeed: { value: speed * 0.5 },
                uScale: { value: scale },
                uOpacity: { value: opacity },
                uMouse: { value: new Float32Array([0, 0]) },
                uMouseInteractive: { value: mouseInteractive ? 1.0 : 0.0 }
            }
        });

        const mesh = new Mesh(gl, { geometry, program });

        const handleMouseMove = (e) => {
            if (!mouseInteractive) return;
            const rect = containerRef.current.getBoundingClientRect();
            mousePos.current.x = e.clientX - rect.left;
            mousePos.current.y = e.clientY - rect.top;
            const mouseUniform = program.uniforms.uMouse.value;
            mouseUniform[0] = mousePos.current.x;
            mouseUniform[1] = mousePos.current.y;
        };

        if (mouseInteractive) {
            containerRef.current.addEventListener('mousemove', handleMouseMove);
        }

        const setSize = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            renderer.setSize(rect.width, rect.height);
            const res = program.uniforms.iResolution.value;
            res[0] = gl.drawingBufferWidth;
            res[1] = gl.drawingBufferHeight;
        };

        const ro = new ResizeObserver(setSize);
        ro.observe(containerRef.current);
        setSize();

        let raf = 0;
        const loop = (t) => {
            program.uniforms.iTime.value = t * 0.001;
            renderer.render({ scene: mesh });
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            if (mouseInteractive && containerRef.current) {
                containerRef.current.removeEventListener('mousemove', handleMouseMove);
            }
            try {
                if (containerRef.current && canvas.parentNode === containerRef.current) {
                    containerRef.current.removeChild(canvas);
                }
            } catch (err) { }
        };
    }, [color, speed, scale, opacity, mouseInteractive]);

    return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} />;
};

export default Plasma;
