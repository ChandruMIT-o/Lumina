import React, { useRef, useEffect, useMemo, useCallback } from "react";

const LetterGlitch = ({
	glitchColors = ["#2b4539", "#61dca3", "#61b3dc"],
	glitchSpeed = 50,
	centerVignette = false,
	outerVignette = true,
	smooth = true,
	characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789",
}: {
	glitchColors?: string[];
	glitchSpeed?: number;
	centerVignette?: boolean;
	outerVignette?: boolean;
	smooth?: boolean;
	characters?: string;
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const animationRef = useRef<number | null>(null);
	const context = useRef<CanvasRenderingContext2D | null>(null);
	const lastGlitchTime = useRef(Date.now());

	// Store RGB values rather than hex strings to avoid parsing per frame
	const grid = useRef({ columns: 0, rows: 0 });
	const letters = useRef<
		{
			char: string;
			color: { r: number; g: number; b: number };
			targetColor: { r: number; g: number; b: number };
			colorProgress: number;
		}[]
	>([]);

	const fontSize = 16;
	const charWidth = 10;
	const charHeight = 20;

	const lettersAndSymbols = useMemo(
		() => Array.from(characters),
		[characters],
	);

	// Helper: Convert Hex to RGB Object once
	const hexToRgb = useCallback((hex: string) => {
		const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(
			shorthandRegex,
			(_m, r, g, b) => r + r + g + g + b + b,
		);
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16),
				}
			: { r: 0, g: 0, b: 0 };
	}, []);

	// Pre-calculate RGB colors to save processing during animation
	const glitchColorsRgb = useMemo(
		() => glitchColors.map(hexToRgb),
		[glitchColors, hexToRgb],
	);

	const getRandomChar = useCallback(() => {
		return lettersAndSymbols[
			Math.floor(Math.random() * lettersAndSymbols.length)
		];
	}, [lettersAndSymbols]);

	const getRandomColor = useCallback(() => {
		return glitchColorsRgb[
			Math.floor(Math.random() * glitchColorsRgb.length)
		];
	}, [glitchColorsRgb]);

	const calculateGrid = (width: number, height: number) => {
		const columns = Math.ceil(width / charWidth);
		const rows = Math.ceil(height / charHeight);
		return { columns, rows };
	};

	const initializeLetters = (columns: number, rows: number) => {
		grid.current = { columns, rows };
		const totalLetters = columns * rows;

		letters.current = Array.from({ length: totalLetters }, () => {
			const color = getRandomColor();
			return {
				char: getRandomChar(),
				color: { ...color },
				targetColor: { ...color },
				colorProgress: 1,
			};
		});
	};

	const resizeCanvas = () => {
		const canvas = canvasRef.current;
		if (!canvas || !canvas.parentElement) return;

		const parent = canvas.parentElement;
		const dpr = window.devicePixelRatio || 1;
		const rect = parent.getBoundingClientRect();

		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		canvas.style.width = `${rect.width}px`;
		canvas.style.height = `${rect.height}px`;

		if (context.current) {
			context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
			// Reset Font after resize
			context.current.font = `${fontSize}px monospace`;
			context.current.textBaseline = "top";
		}

		const { columns, rows } = calculateGrid(rect.width, rect.height);
		initializeLetters(columns, rows);
		drawLetters();
	};

	const drawLetters = () => {
		if (!context.current || letters.current.length === 0) return;
		const ctx = context.current;
		const { width, height } = canvasRef.current!.getBoundingClientRect();
		ctx.clearRect(0, 0, width, height);

		letters.current.forEach((letter, index) => {
			const x = (index % grid.current.columns) * charWidth;
			const y = Math.floor(index / grid.current.columns) * charHeight;

			// Construct RGB string only when drawing
			ctx.fillStyle = `rgb(${Math.floor(letter.color.r)}, ${Math.floor(letter.color.g)}, ${Math.floor(letter.color.b)})`;
			ctx.fillText(letter.char, x, y);
		});
	};

	const updateLetters = () => {
		if (!letters.current.length) return;

		const updateCount = Math.max(
			1,
			Math.floor(letters.current.length * 0.05),
		);

		for (let i = 0; i < updateCount; i++) {
			const index = Math.floor(Math.random() * letters.current.length);
			if (!letters.current[index]) continue;

			letters.current[index].char = getRandomChar();
			letters.current[index].targetColor = getRandomColor();

			if (!smooth) {
				letters.current[index].color = {
					...letters.current[index].targetColor,
				};
				letters.current[index].colorProgress = 1;
			} else {
				letters.current[index].colorProgress = 0;
			}
		}
	};

	const handleSmoothTransitions = () => {
		let needsRedraw = false;

		letters.current.forEach((letter) => {
			if (letter.colorProgress < 1) {
				letter.colorProgress += 0.05;
				if (letter.colorProgress > 1) letter.colorProgress = 1;

				const progress = letter.colorProgress;

				// Simple Linear Interpolation (Lerp)
				letter.color.r =
					letter.color.r +
					(letter.targetColor.r - letter.color.r) * progress;
				letter.color.g =
					letter.color.g +
					(letter.targetColor.g - letter.color.g) * progress;
				letter.color.b =
					letter.color.b +
					(letter.targetColor.b - letter.color.b) * progress;

				needsRedraw = true;
			}
		});

		return needsRedraw;
	};

	const animate = () => {
		const now = Date.now();
		let shouldDraw = false;

		// 1. Check for Glitch Update
		if (now - lastGlitchTime.current >= glitchSpeed) {
			updateLetters();
			shouldDraw = true;
			lastGlitchTime.current = now;
		}

		// 2. Check for Smooth Transitions
		if (smooth) {
			const transitionUpdated = handleSmoothTransitions();
			if (transitionUpdated) shouldDraw = true;
		}

		// 3. Draw only once per frame if needed
		if (shouldDraw) {
			drawLetters();
		}

		animationRef.current = requestAnimationFrame(animate);
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		context.current = canvas.getContext("2d");
		resizeCanvas();
		animate();

		let resizeTimeout: ReturnType<typeof setTimeout>;

		const handleResize = () => {
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(() => {
				cancelAnimationFrame(animationRef.current as number);
				resizeCanvas();
				animate();
			}, 100);
		};

		window.addEventListener("resize", handleResize);

		return () => {
			cancelAnimationFrame(animationRef.current!);
			window.removeEventListener("resize", handleResize);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [glitchSpeed, smooth, glitchColors, characters]); // Dependencies dictate when to restart the loop

	// Styles
	const containerStyle: React.CSSProperties = {
		position: "relative",
		width: "100%",
		height: "100%",
		backgroundColor: "transparent",
		overflow: "hidden",
	};

	const canvasStyle: React.CSSProperties = {
		display: "block",
		width: "100%",
		height: "100%",
	};

	const outerVignetteStyle: React.CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		height: "100%",
		pointerEvents: "none",
		background:
			"radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)",
	};

	const centerVignetteStyle: React.CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		height: "100%",
		pointerEvents: "none",
		background:
			"radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)",
	};

	return (
		<div style={containerStyle}>
			<canvas ref={canvasRef} style={canvasStyle} />
			{outerVignette && <div style={outerVignetteStyle} />}
			{centerVignette && <div style={centerVignetteStyle} />}
		</div>
	);
};

export default LetterGlitch;
