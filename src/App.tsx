import { useState, useEffect, useCallback, useMemo } from "react";
import GuidedGlitch from "./components/GuidedGlitch";

const hexToRgb = (hex: string) => {
	const v = hex.replace("#", "");
	return {
		r: parseInt(v.substring(0, 2), 16),
		g: parseInt(v.substring(2, 4), 16),
		b: parseInt(v.substring(4, 6), 16),
	};
};

const invertHexWithStrength = (hex: string, strength = 0.7) => {
	const v = hex.replace("#", "");
	const r = parseInt(v.slice(0, 2), 16);
	const g = parseInt(v.slice(2, 4), 16);
	const b = parseInt(v.slice(4, 6), 16);

	const ir = 255 - r;
	const ig = 255 - g;
	const ib = 255 - b;

	const mix = (a: number, b: number) => Math.round(a + (b - a) * strength);

	return `#${[mix(r, ir), mix(g, ig), mix(b, ib)]
		.map((x) => x.toString(16).padStart(2, "0"))
		.join("")}`;
};

const rgbToHex = (r: number, g: number, b: number) =>
	`#${[r, g, b]
		.map((x) =>
			Math.max(0, Math.min(255, Math.round(x)))
				.toString(16)
				.padStart(2, "0"),
		)
		.join("")}`;

const darkenHex = (hex: string, factor = 0.25) => {
	const { r, g, b } = hexToRgb(hex);
	return rgbToHex(r * factor, g * factor, b * factor);
};

function App() {
	// Load SVGs
	const svgs = useMemo(() => {
		const modules = import.meta.glob("./assets/svg_bg/*.svg", {
			as: "raw",
			eager: true,
		});
		return Object.values(modules) as string[];
	}, []);

	const charList = [
		"☰☱☲☳☴☵☶☷",
		"▤▥▦▧▨▩",
		"♚♛♜♝♞♟♔♕♖♗♘♙",
		"▖▗▘▙▚▛▜▝▞▟■",
		"◐◑◒◓◔◕",
		"◰◱◲◳◴◵◶◷",
		"10",
		"✻✼❄❅❆❇❈❉❊❋",
		"⣿⣷⣯⣟⡿⢿⣻⣽",
		"αβγδεζηθικλμ",
		"⚀⚁⚂⚃⚄⚅",
		"ᚠᚡᚢᚣᚤᚥᚦᚧᚨᚩᚪᚫ",
		"◢◣◤◥",
		"♠♥♦♣♤♢♧♡",
		"✽✾✿❀❁❂❃",
		"┌┐└┘├┤┬┴┼─",
		"╓╔╕╖╗╘╙╚╛╜╝",
		"⋐⋑⋒⋓",
		"abcdefghijklmnopqrstuvwxyz",
	];

	const colorPairs = [
		["#6afbcb", "#00b8ff", "#d600ff"], // Cyberpunk Neon
		["#ff92b3", "#ff9900", "#ff00cc"], // Sunset Neon
		["#7dff9a", "#00ff00", "#003b00"], // Matrix Green
		["#ff7fcc", "#ff00ff", "#9900ff"], // Electric Purple
		["#62fafa", "#0099ff", "#0000ff"], // Ice Blue
		["#ffff7d", "#ffcc00", "#ff9900"], // High Voltage
		["#ffa5a5", "#ff0000", "#990000"], // Red Alert
		["#9dff85", "#ffffff", "#00ff00"], // Acid Green
		["#ff6a00", "#ffcc00", "#fff200"], // Firestorm
		["#00ffe1", "#00aaff", "#0055ff"], // Aqua Plasma
		["#b388ff", "#7c4dff", "#651fff"], // Deep Violet
		["#ff4081", "#f50057", "#c51162"], // Hot Pink
		["#18ffff", "#00e5ff", "#00b0ff"], // Cyan Beam
		["#76ff03", "#64dd17", "#33691e"], // Toxic Slime
		["#ffd740", "#ffab00", "#ff6f00"], // Amber Glow
		["#69f0ae", "#00e676", "#00c853"], // Mint Pulse
		["#40c4ff", "#2979ff", "#1a237e"], // Electric Blue
		["#ff5252", "#ff1744", "#d50000"], // Crimson Flash
	];

	const [backgroundColors, setBackgroundColors] = useState<string[]>([]);

	const [glitchColors, setGlitchColors] = useState(colorPairs[0]);
	const [glitchChars, setGlitchChars] = useState(charList[0]);

	const INVERT_STRENGTH = 1;
	const DARKNESS_STRENGTH = 1;

	const changeBackground = useCallback(() => {
		const randomColors =
			colorPairs[Math.floor(Math.random() * colorPairs.length)];
		const randomChars =
			charList[Math.floor(Math.random() * charList.length)];

		setGlitchColors(randomColors);
		setGlitchChars(randomChars);

		const backgroundVariants = randomColors.map((c) =>
			darkenHex(
				invertHexWithStrength(c, INVERT_STRENGTH),
				DARKNESS_STRENGTH,
			),
		);

		setBackgroundColors(backgroundVariants);
	}, [colorPairs, charList]);

	useEffect(() => {
		const interval = setInterval(changeBackground, 5000);
		return () => clearInterval(interval);
	}, [changeBackground, glitchColors, glitchChars]);

	const handleBackgroundClick = (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;
		if (
			target.tagName === "INPUT" ||
			target.tagName === "BUTTON" ||
			target.closest("button")
		) {
			return;
		}
		changeBackground();
	};

	return (
		<div
			onClick={handleBackgroundClick}
			className="min-h-screen text-slate-200 flex flex-col font-sans relative overflow-hidden cursor-crosshair bg-[#050505]"
		>
			<div className="fixed inset-0 z-0 opacity-100">
				<GuidedGlitch
					speed={60}
					morphSpeed={0.004}
					glitchColors={glitchColors}
					backgroundColors={backgroundColors}
					characters={glitchChars}
					outerVignette={true}
					svgs={svgs}
					fontSize={16}
				/>
			</div>
			{/* Optional Interaction Hint */}
			<div className="pointer-events-none absolute bottom-8 w-full text-center text-[10px] tracking-[0.5em] text-white/20 uppercase">
				Neural Link Active // Click to Signal
			</div>
		</div>
	);
}

export default App;
