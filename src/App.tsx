import { useState, useEffect, useCallback } from "react";
import LetterGlitch from "./components/LetterGlitch";

function App() {
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

	const [glitchColors, setGlitchColors] = useState(colorPairs[0]);
	const [glitchChars, setGlitchChars] = useState(charList[0]);

	const changeBackground = useCallback(() => {
		const randomColors =
			colorPairs[Math.floor(Math.random() * colorPairs.length)];
		const randomChars =
			charList[Math.floor(Math.random() * charList.length)];
		setGlitchColors(randomColors);
		setGlitchChars(randomChars);
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
			<div className="fixed inset-0 z-0 opacity-80">
				<LetterGlitch
					glitchSpeed={100}
					glitchColors={glitchColors}
					characters={glitchChars}
					outerVignette={true}
				/>
			</div>
		</div>
	);
}

export default App;
