import React, {
	useRef,
	useEffect,
	useMemo,
	useCallback,
	useState,
} from "react";

// --- Geometry & Morphing Logic ---
const TOTAL_POINTS = 200; // Increased for better detail on complex SVGs

// Helper to create polygon points
const createPoints = (fn: (i: number) => { x: number; y: number }) => {
	return Array.from({ length: TOTAL_POINTS }, (_, i) => fn(i));
};

// Default Shape Generators (Normalized 0-100 coordinate space)
const DEFAULT_SHAPES = [
	// 1. Circle
	createPoints((i) => {
		const angle = (i / TOTAL_POINTS) * Math.PI * 2;
		return {
			x: 50 + 35 * Math.cos(angle),
			y: 50 + 35 * Math.sin(angle),
		};
	}),
	// 2. Star
	createPoints((i) => {
		const angle = (i / TOTAL_POINTS) * Math.PI * 2 * 5; // 5 points
		const radius = i % 2 === 0 ? 40 : 15; // Alternating radii

		const starAngle = (i / TOTAL_POINTS) * Math.PI * 2;
		const r = 25 + 15 * Math.cos(starAngle * 5);
		return {
			x: 50 + r * Math.cos(starAngle),
			y: 50 + r * Math.sin(starAngle),
		};
	}),
	// 3. Square
	createPoints((i) => {
		// Map index 0-TOTAL to perimeter of square
		const progress = i / TOTAL_POINTS;
		const size = 70;
		const half = size / 2;
		let x, y;
		if (progress < 0.25) {
			// Top
			x = (progress / 0.25) * size - half;
			y = -half;
		} else if (progress < 0.5) {
			// Right
			x = half;
			y = ((progress - 0.25) / 0.25) * size - half;
		} else if (progress < 0.75) {
			// Bottom
			x = half - ((progress - 0.5) / 0.25) * size;
			y = half;
		} else {
			// Left
			x = -half;
			y = half - ((progress - 0.75) / 0.25) * size;
		}
		return { x: 50 + x, y: 50 + y };
	}),
	// 4. Diamond
	createPoints((i) => {
		const angle = (i / TOTAL_POINTS) * Math.PI * 2;
		// Superellipse-ish for sharp diamond
		const r = 40 / (Math.abs(Math.sin(angle)) + Math.abs(Math.cos(angle)));
		return {
			x: 50 + r * Math.cos(angle),
			y: 50 + r * Math.sin(angle),
		};
	}),
];

interface GuidedGlitchProps {
	glitchColors: string[]; // Active Palette (Inside Shape)
	backgroundColors?: string[]; // Passive Palette (Outside Shape)
	speed?: number;
	morphSpeed?: number;
	characters?: string;
	fontSize?: number;
	outerVignette?: boolean;
	svgs?: string[]; // List of SVG contents
}

const GuidedGlitch: React.FC<GuidedGlitchProps> = ({
	glitchColors,
	backgroundColors = ["#1a1a1a", "#0d0d0d", "#262626"], // Dark grey/black defaults
	speed = 50,
	morphSpeed = 0.002, // Slower for liquid feel
	characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
	fontSize = 16,
	outerVignette = true,
	svgs,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const guideCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const context = useRef<CanvasRenderingContext2D | null>(null);
	const guideContext = useRef<CanvasRenderingContext2D | null>(null);

	const animationRef = useRef<number | null>(null);
	const lastGlitchTime = useRef(Date.now());

	// Morphing State
	const morphState = useRef({
		currentShapeIdx: 0,
		nextShapeIdx: 1,
		progress: 0,
	});

	// Store shapes in a ref so we can update them when svgs prop changes
	const shapesRef = useRef<{ x: number; y: number }[][]>(DEFAULT_SHAPES);

	const grid = useRef({ columns: 0, rows: 0 });
	const letters = useRef<
		{
			char: string;
			color: { r: number; g: number; b: number };
			targetColor: { r: number; g: number; b: number };
			colorProgress: number;
			isInside: boolean;
		}[]
	>([]);

	// Helpers
	const hexToRgb = useCallback((hex: string) => {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16),
				}
			: { r: 0, g: 0, b: 0 };
	}, []);

	// Memoize RGB palettes
	const insideRgb = useMemo(
		() => glitchColors.map(hexToRgb),
		[glitchColors, hexToRgb],
	);
	const outsideRgb = useMemo(
		() => backgroundColors.map(hexToRgb),
		[backgroundColors, hexToRgb],
	);
	const charsArray = useMemo(() => Array.from(characters), [characters]);

	const getRandomChar = useCallback(
		() => charsArray[Math.floor(Math.random() * charsArray.length)],
		[charsArray],
	);
	const getRandomColor = useCallback(
		(palette: { r: number; g: number; b: number }[]) =>
			palette[Math.floor(Math.random() * palette.length)],
		[],
	);

	// Parse SVGs into points
	useEffect(() => {
		if (svgs && svgs.length > 0) {
			const parsedShapes = svgs
				.map((svgContent) => {
					// 1. Parse SVG string to DOM
					const parser = new DOMParser();
					const doc = parser.parseFromString(
						svgContent,
						"image/svg+xml",
					);

					// Select ALL paths, but filter out those in defs or masks
					const allPaths = Array.from(doc.querySelectorAll("path"));
					const validPaths = allPaths.filter((path) => {
						// Traverse up to check if it's inside a mask or defs
						let parent = path.parentElement;
						while (parent) {
							if (
								parent.tagName === "mask" ||
								parent.tagName === "defs" ||
								parent.tagName === "clipPath"
							) {
								return false;
							}
							if (parent.tagName === "svg") break;
							parent = parent.parentElement;
						}
						return true;
					});

					if (validPaths.length === 0) return null;

					// 2. Sample points across ALL paths using cumulative length
					const pathLengths = validPaths.map((p) =>
						p.getTotalLength(),
					);
					const totalLength = pathLengths.reduce((a, b) => a + b, 0);

					const points: { x: number; y: number }[] = [];

					// We need to determine the bounding box to normalize 0-100
					let minX = Infinity,
						minY = Infinity,
						maxX = -Infinity,
						maxY = -Infinity;

					// First, sample points uniformly across the total logical length
					for (let i = 0; i < TOTAL_POINTS; i++) {
						const targetDistance = (i / TOTAL_POINTS) * totalLength;

						// Find which path this distance corresponds to
						let currentAcc = 0;
						let targetPathIndex = 0;
						let distanceInPath = 0;

						for (let j = 0; j < pathLengths.length; j++) {
							if (currentAcc + pathLengths[j] >= targetDistance) {
								targetPathIndex = j;
								distanceInPath = targetDistance - currentAcc;
								break;
							}
							currentAcc += pathLengths[j];
						}

						// Handle edge case (last point)
						if (targetPathIndex >= validPaths.length) {
							targetPathIndex = validPaths.length - 1;
							distanceInPath = pathLengths[targetPathIndex];
						}

						const point =
							validPaths[targetPathIndex].getPointAtLength(
								distanceInPath,
							);

						minX = Math.min(minX, point.x);
						minY = Math.min(minY, point.y);
						maxX = Math.max(maxX, point.x);
						maxY = Math.max(maxY, point.y);
						points.push({ x: point.x, y: point.y });
					}

					// 3. Normalize to 0-100 centered
					const width = maxX - minX;
					const height = maxY - minY;
					// Use a bounding box to keep things contained
					// Avoid Division by Zero
					const safeW = width || 1;
					const safeH = height || 1;

					const scale = 100 / Math.max(safeW, safeH); // usage 101% of space (Cover)
					const offsetX = (100 - width * scale) / 2;
					const offsetY = (100 - height * scale) / 2;

					return points.map((p) => ({
						x: (p.x - minX) * scale + offsetX,
						y: (p.y - minY) * scale + offsetY,
					}));
				})
				.filter((s): s is { x: number; y: number }[] => s !== null) as {
				x: number;
				y: number;
			}[][];

			if (parsedShapes.length > 0) {
				shapesRef.current = parsedShapes;
				// Reset morph state if shapes change
				morphState.current = {
					currentShapeIdx: 0,
					nextShapeIdx: 1 % parsedShapes.length,
					progress: 0,
				};
			}
		} else {
			// Fallback to default shapes if no SVGs provided
			// shapesRef.current = DEFAULT_SHAPES;
		}
	}, [svgs]);

	// Ease function for smoother morphs
	const easeInOutCubic = (t: number) =>
		t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

	// --- Initialization ---
	const resizeCanvases = useCallback(() => {
		if (
			!canvasRef.current ||
			!canvasRef.current.parentElement ||
			!guideCanvasRef.current
		)
			return;

		const parent = canvasRef.current.parentElement;
		const rect = parent.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;

		// Main Canvas
		canvasRef.current.width = rect.width * dpr;
		canvasRef.current.height = rect.height * dpr;
		canvasRef.current.style.width = `${rect.width}px`;
		canvasRef.current.style.height = `${rect.height}px`;

		context.current = canvasRef.current.getContext("2d");
		if (context.current) {
			context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
			context.current.font = `${fontSize}px monospace`;
			context.current.textBaseline = "top";
		}

		// Guide Canvas (Low Res Mask)
		// We make it aspect-correct relative to viewport to avoid stretching
		const guideLongSide = 200;
		if (rect.width > rect.height) {
			guideCanvasRef.current.width = guideLongSide;
			guideCanvasRef.current.height = Math.max(
				1,
				guideLongSide * (rect.height / rect.width),
			);
		} else {
			guideCanvasRef.current.height = guideLongSide;
			guideCanvasRef.current.width = Math.max(
				1,
				guideLongSide * (rect.width / rect.height),
			);
		}

		guideContext.current = guideCanvasRef.current.getContext("2d", {
			willReadFrequently: true,
		});

		// Grid Setup
		const charWidth = fontSize * 0.6;
		const charHeight = fontSize;
		const columns = Math.ceil(rect.width / charWidth);
		const rows = Math.ceil(rect.height / charHeight);

		grid.current = { columns, rows };

		// Reset/Init Letters
		const totalLetters = columns * rows;
		letters.current = Array.from({ length: totalLetters }, () => {
			const col = getRandomColor(outsideRgb);
			return {
				char: getRandomChar(),
				color: { ...col },
				targetColor: { ...col },
				colorProgress: 1,
				isInside: false,
			};
		});
	}, [fontSize, getRandomChar, getRandomColor, outsideRgb]);

	// --- The Loop ---
	const animate = useCallback(() => {
		if (
			!guideContext.current ||
			!guideCanvasRef.current ||
			!context.current ||
			!canvasRef.current
		)
			return;

		const shapes = shapesRef.current;
		if (shapes.length === 0) return;

		// 1. Update Morph Progress
		morphState.current.progress += morphSpeed;
		if (morphState.current.progress >= 1) {
			morphState.current.progress = 0;
			morphState.current.currentShapeIdx =
				morphState.current.nextShapeIdx;
			morphState.current.nextShapeIdx =
				(morphState.current.nextShapeIdx + 1) % shapes.length;
		}

		// 2. Draw Interpolated Shape on Guide Canvas
		const gCtx = guideContext.current;
		const gW = guideCanvasRef.current.width;
		const gH = guideCanvasRef.current.height;
		gCtx.clearRect(0, 0, gW, gH);

		gCtx.fillStyle = "white";
		gCtx.beginPath();

		const currentShape = shapes[morphState.current.currentShapeIdx];
		const nextShape = shapes[morphState.current.nextShapeIdx];

		// Safety check
		if (!currentShape || !nextShape) {
			animationRef.current = requestAnimationFrame(animate);
			return;
		}

		const t = easeInOutCubic(morphState.current.progress);

		// Aspect Ratio Preserving Map (Contain)
		// We want to map the 0-100 logic box to a square centered on the canvas
		// The side of the square should be the min dimension of the canvas
		const size = Math.max(gW, gH);
		const offsetX = (gW - size) / 2;
		const offsetY = (gH - size) / 2;

		for (let i = 0; i < TOTAL_POINTS; i++) {
			const curP = currentShape[i] || currentShape[0]; // fallback
			const nextP = nextShape[i] || nextShape[0]; // fallback

			// Interpolate X/Y
			const x = curP.x + (nextP.x - curP.x) * t;
			const y = curP.y + (nextP.y - curP.y) * t;

			// Map 0-100 coordinate space to guide canvas size (Uniform Scale)
			const drawX = (x / 100) * size + offsetX;
			const drawY = (y / 100) * size + offsetY;

			if (i === 0) gCtx.moveTo(drawX, drawY);
			else gCtx.lineTo(drawX, drawY);
		}
		gCtx.closePath();
		gCtx.fill();

		// 3. Read Mask Data
		const guideData = gCtx.getImageData(0, 0, gW, gH).data;

		// 4. Update Letters
		const now = Date.now();
		const shouldGlitch = now - lastGlitchTime.current >= speed;
		if (shouldGlitch) lastGlitchTime.current = now;

		const charWidth = fontSize * 0.6;
		const charHeight = fontSize;

		// Fix for resize issues where grid might not match current letters count
		if (
			letters.current.length !==
			grid.current.columns * grid.current.rows
		) {
			// Skip frame or simple re-init could happen here, keeping it safe
		}

		letters.current.forEach((letter, index) => {
			// Calculate grid position
			const col = index % grid.current.columns;
			const row = Math.floor(index / grid.current.columns);

			// Map grid position to guide canvas coordinate
			// We need normalized (0-1) position
			const normX = col / grid.current.columns;
			const normY = row / grid.current.rows;

			// Map to guide canvas pixels
			const guideX = Math.floor(normX * gW);
			const guideY = Math.floor(normY * gH);

			// Sample Alpha/Red from guide
			const pixelIndex = (guideY * gW + guideX) * 4;
			// Simple threshold
			const isInsideNow = guideData[pixelIndex + 3] > 100; // Alpha > 100

			// If state changed, instant retarget
			if (letter.isInside !== isInsideNow) {
				letter.isInside = isInsideNow;
				letter.targetColor = isInsideNow
					? getRandomColor(insideRgb)
					: getRandomColor(outsideRgb);
				letter.colorProgress = 0;
			}

			// Normal Glitch behavior
			if (shouldGlitch && Math.random() < 0.05) {
				// 5% chance to glitch per tick
				letter.char = getRandomChar();
				// Also occasionally refresh color if we are fully settled
				if (letter.colorProgress === 1) {
					letter.targetColor = letter.isInside
						? getRandomColor(insideRgb)
						: getRandomColor(outsideRgb);
					letter.colorProgress = 0;
				}
			}

			// Smooth Color Transition
			if (letter.colorProgress < 1) {
				letter.colorProgress += 0.1; // Fast transition
				if (letter.colorProgress > 1) letter.colorProgress = 1;

				const t = letter.colorProgress;
				letter.color.r += (letter.targetColor.r - letter.color.r) * t;
				letter.color.g += (letter.targetColor.g - letter.color.g) * t;
				letter.color.b += (letter.targetColor.b - letter.color.b) * t;
			}
		});

		// 5. Draw Main Canvas
		const ctx = context.current;
		ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

		// Optimization: loop once
		for (let i = 0; i < letters.current.length; i++) {
			const letter = letters.current[i];
			const col = i % grid.current.columns;
			const row = Math.floor(i / grid.current.columns);
			const x = col * charWidth;
			const y = row * charHeight;

			// Simple int casting
			ctx.fillStyle = `rgb(${letter.color.r | 0},${letter.color.g | 0},${letter.color.b | 0})`;
			ctx.fillText(letter.char, x, y);
		}

		animationRef.current = requestAnimationFrame(animate);
	}, [
		speed,
		morphSpeed,
		insideRgb,
		outsideRgb,
		fontSize,
		getRandomChar,
		getRandomColor,
	]);

	useEffect(() => {
		resizeCanvases();
		animationRef.current = requestAnimationFrame(animate);
		const handleResize = () => resizeCanvases();
		window.addEventListener("resize", handleResize);
		return () => {
			if (animationRef.current)
				cancelAnimationFrame(animationRef.current);
			window.removeEventListener("resize", handleResize);
		};
	}, [resizeCanvases, animate]);

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

	return (
		<div
			style={{
				position: "relative",
				width: "100%",
				height: "100%",
				overflow: "hidden",
			}}
		>
			<canvas
				ref={canvasRef}
				style={{ display: "block", width: "100%", height: "100%" }}
			/>
			<canvas ref={guideCanvasRef} style={{ display: "none" }} />
			{outerVignette && <div style={outerVignetteStyle} />}
		</div>
	);
};

export default GuidedGlitch;
