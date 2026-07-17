"use client";

import { useEffect, useRef } from "react";

export default function BackgroundShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    window.addEventListener("resize", syncSize);
    syncSize();

    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        vec2 uv = v_texCoord;
        
        // Background color
        vec3 color1 = vec3(0.043, 0.039, 0.063); // Deep Obsidian
        vec3 color2 = vec3(0.12, 0.05, 0.25);   // Deep Purple
        
        // Animated gradient
        float noise = sin(uv.x * 2.0 + u_time * 0.5) * cos(uv.y * 2.0 - u_time * 0.3);
        vec3 bg = mix(color1, color2, uv.y + noise * 0.2);
        
        // Glowing orbs
        vec2 p1 = vec2(0.2 + 0.1 * sin(u_time * 0.4), 0.3 + 0.1 * cos(u_time * 0.5));
        float d1 = length(uv - p1);
        vec3 orb1 = vec3(0.5, 0.0, 1.0) * (0.05 / (d1 + 0.1));
        
        vec2 p2 = vec2(0.8 + 0.1 * cos(u_time * 0.6), 0.7 + 0.1 * sin(u_time * 0.3));
        float d2 = length(uv - p2);
        vec3 orb2 = vec3(0.0, 0.6, 1.0) * (0.05 / (d2 + 0.1));
        
        gl_FragColor = vec4(bg + orb1 + orb2, 1.0);
      }
    `;

    function compileShader(glContext: WebGLRenderingContext, type: number, src: string) {
      const shader = glContext.createShader(type);
      if (!shader) return null;
      glContext.shaderSource(shader, src);
      glContext.compileShader(shader);
      if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        console.error("Shader compile error:", glContext.getShaderInfoLog(shader));
        glContext.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vs);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fs);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posAttr = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");

    let animationFrameId: number;

    function render(time: number) {
      if (!canvas || !gl) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTime, time * 0.001);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", syncSize);
      cancelAnimationFrame(animationFrameId);
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(buffer);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full opacity-45 pointer-events-none -z-10"
      style={{ display: "block" }}
    />
  );
}
