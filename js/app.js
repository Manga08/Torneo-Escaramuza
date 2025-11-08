(() => {
	const MAPS = [
		{
			id: 'a',
			label: 'A',
			image: 'assets/Escaramuza_A.jpeg',
			legacy: ['district']
		},
		{
			id: 'b',
			label: 'B',
			image: 'assets/Escaramuza_B.jpeg',
			legacy: ['piazza']
		},
		{
			id: 'c',
			label: 'C',
			image: 'assets/Escaramuza_C.jpeg',
			legacy: ['kasbah']
		}
	];

	const LEGACY_LOOKUP = MAPS.reduce((lookup, map) => {
		if (Array.isArray(map.legacy)) {
			map.legacy.forEach((legacyId) => {
				lookup[legacyId.toLowerCase()] = map.id;
			});
		}
		return lookup;
	}, {});

	const STORAGE_KEY = 'escaramuza-tdm-state';

	const elements = {
		randomizeBtn: document.getElementById('randomize'),
		resetBtn: document.getElementById('reset'),
		slotColumns: Array.from(document.querySelectorAll('.slot__column')),
		resultCard: document.querySelector('.result-card'),
		resultTitle: document.getElementById('winner-name'),
		historyList: document.getElementById('history-list'),
		placeholderHistory: document.querySelector('.history__placeholder'),
		noRepeatToggle: document.getElementById('no-repeat-toggle'),
		soundToggle: document.getElementById('sound-toggle'),
		streamerToggle: document.getElementById('streamer-toggle'),
		themeToggle: document.getElementById('theme-toggle'),
		audio: document.getElementById('sfx-win'),
		streamerExit: document.getElementById('streamer-exit')
	};

	const defaultPool = () => MAPS.map((map) => map.id);

	const state = {
		lastWinner: null,
		history: [],
		pool: defaultPool(),
		isRolling: false,
		noRepeat: true,
		soundOn: true,
		themeRoyal: false,
		streamerMode: false
	};

	const persistState = () => {
		const payload = {
			lastWinner: state.lastWinner,
			history: state.history,
			pool: state.pool,
			noRepeat: state.noRepeat,
			soundOn: state.soundOn,
			themeRoyal: state.themeRoyal,
			streamerMode: state.streamerMode
		};
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
		} catch (error) {
			console.warn('No se pudo guardar el estado:', error);
		}
	};

	const normalizeId = (id) => {
		if (typeof id !== 'string') return null;
		const lowered = id.toLowerCase();
		const direct = MAPS.find((map) => map.id === lowered);
		if (direct) return direct.id;
		if (LEGACY_LOOKUP[lowered]) return LEGACY_LOOKUP[lowered];
		return null;
	};

	const restoreState = () => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return;
			const data = JSON.parse(stored);
			if (Array.isArray(data.history)) {
				state.history = data.history
					.map(normalizeId)
					.filter((value) => value !== null)
					.slice(0, 5);
			}
			if (Array.isArray(data.pool) && data.pool.length) {
				const migratedPool = data.pool
					.map(normalizeId)
					.filter((value) => value !== null);
				state.pool = migratedPool.length ? migratedPool : defaultPool();
			}
			if (typeof data.lastWinner === 'string') {
				const migratedWinner = normalizeId(data.lastWinner);
				if (migratedWinner) state.lastWinner = migratedWinner;
			}
			if (typeof data.noRepeat === 'boolean') state.noRepeat = data.noRepeat;
			if (typeof data.soundOn === 'boolean') state.soundOn = data.soundOn;
			if (typeof data.themeRoyal === 'boolean')
				state.themeRoyal = data.themeRoyal;
			if (typeof data.streamerMode === 'boolean')
				state.streamerMode = data.streamerMode;
		} catch (error) {
			console.warn('No se pudo restaurar el estado:', error);
		}
	};

	const mapById = (id) => MAPS.find((map) => map.id === id) || MAPS[0];

	const renderHistory = () => {
		if (!elements.historyList) return;
		elements.historyList.innerHTML = '';
		if (state.history.length === 0) {
			if (elements.placeholderHistory) {
				elements.placeholderHistory.hidden = false;
				elements.historyList.appendChild(elements.placeholderHistory);
			}
			return;
		}
		if (elements.placeholderHistory) {
			elements.placeholderHistory.hidden = true;
		}
		state.history.slice(0, 5).forEach((entry) => {
			const map = mapById(entry);
			const chip = document.createElement('span');
			chip.className = 'history__chip';
			chip.setAttribute('role', 'listitem');
			chip.textContent = map.label;
			chip.setAttribute('aria-label', `Mapa ${map.label}`);
			chip.title = `Mapa ${map.label}`;
			elements.historyList.appendChild(chip);
		});
	};

	const buildColumnStack = (column, sequence) => {
		const stack = document.createElement('div');
		stack.className = 'slot__stack';
		sequence.forEach((label) => {
			const item = document.createElement('span');
			item.className = 'slot__item';
			item.textContent = label;
			item.setAttribute('aria-hidden', 'true');
			stack.appendChild(item);
		});
		column.innerHTML = '';
		column.appendChild(stack);
		return stack;
	};

	const setColumnIdle = (column, label) => {
		// create enough items to fill the visible column area so there is no empty space
		// measure a slot item height by creating a hidden sample element
		let itemHeight = 60; // fallback
		try {
			const sample = document.createElement('span');
			sample.className = 'slot__item';
			sample.style.visibility = 'hidden';
			sample.style.position = 'absolute';
			sample.textContent = label || 'A';
			document.body.appendChild(sample);
			const rect = sample.getBoundingClientRect();
			if (rect.height > 0) itemHeight = rect.height;
			document.body.removeChild(sample);
		} catch (e) {
			// ignore measurement errors and use fallback
		}

		const columnHeight = column.getBoundingClientRect().height || 240;
		const visibleCount = Math.max(6, Math.ceil(columnHeight / itemHeight) + 2);
		const sequence = new Array(visibleCount).fill(label);
		buildColumnStack(column, sequence);
		column.dataset.state = 'idle';
		column.removeAttribute('aria-hidden');
		column.setAttribute('aria-label', `Mapa ${label}`);
	};

	const createRollingSequence = () => {
		const sequence = [];
		const loops = 9;
		for (let index = 0; index < loops; index += 1) {
			const randomMap = MAPS[Math.floor(Math.random() * MAPS.length)];
			sequence.push(randomMap.label);
		}
		if (sequence.length) {
			sequence.push(sequence[0]);
		}
		return sequence;
	};

	const startSlotAnimation = () => {
		elements.slotColumns.forEach((column) => {
			column.dataset.state = 'rolling';
			column.setAttribute('aria-hidden', 'true');
			const sequence = createRollingSequence();
			const stack = buildColumnStack(column, sequence);
			const firstItem = stack.firstElementChild;
			const itemHeight = firstItem
				? firstItem.getBoundingClientRect().height
				: 60;
			const travelDistance = itemHeight * sequence.length;
			column.style.setProperty('--slot-loop-distance', `${travelDistance}px`);
			column.style.setProperty(
				'--slot-duration',
				`${0.55 + Math.random() * 0.35}s`
			);
		});
	};

	const stopSlotAnimation = (label) => {
		elements.slotColumns.forEach((column) => {
			column.style.removeProperty('--slot-duration');
			column.style.removeProperty('--slot-loop-distance');
			setColumnIdle(column, label);
		});
	};

	const setWinnerBackground = (mapId) => {
		if (!elements.resultCard) return;
		if (!mapId) {
			elements.resultCard.style.removeProperty('--winner-image');
			return;
		}
		const map = mapById(mapId);
		if (map?.image) {
			elements.resultCard.style.setProperty(
				'--winner-image',
				`url(${map.image})`
			);
		}
	};

	const playRevealAnimation = () => {
		if (!elements.resultCard || !elements.resultTitle) return;
		elements.resultCard.dataset.state = 'revealed';
		elements.resultCard.classList.remove('glitching');
		void elements.resultCard.offsetWidth;
		elements.resultCard.classList.add('glitching');
		elements.resultTitle.dataset.anim = 'flicker';
		window.setTimeout(() => {
			if (elements.resultTitle) {
				elements.resultTitle.dataset.anim = '';
			}
		}, 1800);
	};

	let audioContext = null;
	const playSound = ({ repeat = false } = {}) => {
		if (!state.soundOn) return;
		const playWithAudioTag = () => {
			if (!elements.audio) return Promise.reject(new Error('No audio element'));
			elements.audio.currentTime = 0;
			return elements.audio.play();
		};
		playWithAudioTag().catch(() => {
			audioContext = audioContext || new AudioContext();
			const osc = audioContext.createOscillator();
			const gain = audioContext.createGain();
			osc.type = 'sawtooth';
			osc.frequency.value = repeat ? 360 : 560;
			gain.gain.setValueAtTime(repeat ? 0.14 : 0.18, audioContext.currentTime);
			gain.gain.exponentialRampToValueAtTime(
				0.001,
				audioContext.currentTime + 0.3
			);
			osc.connect(gain).connect(audioContext.destination);
			osc.start();
			osc.stop(audioContext.currentTime + 0.32);
		});
	};

	const triggerConfetti = () => {
		if (!window.confetti) return;
		const colors = state.themeRoyal
			? ['#6af3ff', '#9b5bff', '#3d9eff']
			: ['#16ff8f', '#5c61ff', '#8b3dff'];
		window.confetti({
			particleCount: 60,
			spread: 65,
			origin: { y: 0.6 },
			colors,
			scalar: 0.9
		});
	};

	const applyBodyClasses = () => {
		document.body.classList.toggle('streamer-mode', state.streamerMode);
		document.body.classList.toggle('theme-royal', state.themeRoyal);
		if (elements.streamerExit) {
			elements.streamerExit.hidden = !state.streamerMode;
			elements.streamerExit.setAttribute(
				'aria-hidden',
				String(!state.streamerMode)
			);
		}
	};

	const syncToggles = () => {
		if (elements.noRepeatToggle)
			elements.noRepeatToggle.checked = state.noRepeat;
		if (elements.soundToggle) elements.soundToggle.checked = state.soundOn;
		if (elements.streamerToggle)
			elements.streamerToggle.checked = state.streamerMode;
		if (elements.themeToggle) elements.themeToggle.checked = state.themeRoyal;
		applyBodyClasses();
	};

	const syncWinner = () => {
		if (!elements.resultTitle || !elements.resultCard) return;
		if (!state.lastWinner) {
			elements.resultTitle.textContent = 'Listo para randomizar';
			elements.resultTitle.removeAttribute('aria-label');
			elements.resultCard.dataset.state = 'idle';
			setWinnerBackground(null);
			return;
		}
		const winner = mapById(state.lastWinner);
		elements.resultTitle.textContent = winner.label;
		elements.resultTitle.setAttribute('aria-label', `Mapa ${winner.label}`);
		elements.resultCard.dataset.state = 'revealed';
		setWinnerBackground(winner.id);
		stopSlotAnimation(winner.label);
	};

	const primeSlotColumns = () => {
		elements.slotColumns.forEach((column, index) => {
			const map = MAPS[index % MAPS.length];
			setColumnIdle(column, map.label);
		});
	};

	const resetState = () => {
		state.lastWinner = null;
		state.history = [];
		state.pool = defaultPool();
		if (elements.resultCard) elements.resultCard.dataset.state = 'idle';
		if (elements.resultTitle) {
			elements.resultTitle.textContent = 'Listo para randomizar';
			elements.resultTitle.removeAttribute('aria-label');
		}
		setWinnerBackground(null);
		renderHistory();
		persistState();
	};

	const pickWinner = () => {
		if (state.noRepeat) {
			if (state.pool.length === 0) {
				state.pool = defaultPool();
			}
			const index = Math.floor(Math.random() * state.pool.length);
			const winnerId = state.pool.splice(index, 1)[0];
			return mapById(winnerId);
		}
		const index = Math.floor(Math.random() * MAPS.length);
		return MAPS[index];
	};

	const randomize = () => {
		if (state.isRolling) return;
		state.isRolling = true;
		if (elements.randomizeBtn) elements.randomizeBtn.disabled = true;
		if (elements.resetBtn) elements.resetBtn.disabled = true;

		startSlotAnimation();
		if (elements.resultCard) elements.resultCard.dataset.state = 'rolling';

		const revealDelay = 950 + Math.random() * 320;
		window.setTimeout(() => {
			try {
				const winner = pickWinner();
				state.lastWinner = winner.id;
				state.history.unshift(winner.id);
				state.history = state.history.slice(0, 5);

				stopSlotAnimation(winner.label);
				if (elements.resultTitle) {
					elements.resultTitle.textContent = winner.label;
					elements.resultTitle.setAttribute(
						'aria-label',
						`Mapa ${winner.label}`
					);
				}
				setWinnerBackground(winner.id);
				playRevealAnimation();
				triggerConfetti();

				const repeated = !state.noRepeat && state.history[1] === winner.id;
				playSound({ repeat: repeated });

				renderHistory();
				persistState();
			} finally {
				if (elements.randomizeBtn) elements.randomizeBtn.disabled = false;
				if (elements.resetBtn) elements.resetBtn.disabled = false;
				state.isRolling = false;
			}
		}, revealDelay);
	};

	const toggleStreamerMode = (value) => {
		state.streamerMode = value;
		if (elements.streamerToggle)
			elements.streamerToggle.checked = state.streamerMode;
		applyBodyClasses();
		persistState();
	};

	const isInteractiveElement = (el) => {
		if (!el) return false;
		return ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(el.tagName);
	};

	if (elements.randomizeBtn) {
		elements.randomizeBtn.addEventListener('click', randomize);
		elements.randomizeBtn.addEventListener('keydown', (event) => {
			if (event.code === 'Space') {
				event.preventDefault();
				randomize();
			}
		});
	}

	if (elements.resetBtn) {
		elements.resetBtn.addEventListener('click', () => {
			resetState();
			persistState();
		});
	}

	if (elements.noRepeatToggle) {
		elements.noRepeatToggle.addEventListener('change', (event) => {
			state.noRepeat = event.target.checked;
			if (state.noRepeat) {
				state.pool = defaultPool();
			}
			persistState();
		});
	}

	if (elements.soundToggle) {
		elements.soundToggle.addEventListener('change', (event) => {
			state.soundOn = event.target.checked;
			persistState();
		});
	}

	if (elements.streamerToggle) {
		elements.streamerToggle.addEventListener('change', (event) => {
			toggleStreamerMode(event.target.checked);
		});
	}

	if (elements.themeToggle) {
		elements.themeToggle.addEventListener('change', (event) => {
			state.themeRoyal = event.target.checked;
			applyBodyClasses();
			persistState();
		});
	}

	if (elements.streamerExit) {
		elements.streamerExit.addEventListener('click', () => {
			toggleStreamerMode(false);
			elements.randomizeBtn?.focus();
		});
	}

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && state.streamerMode) {
			event.preventDefault();
			toggleStreamerMode(false);
			return;
		}
		if (state.isRolling) return;
		if (event.code !== 'Space' && event.code !== 'Enter') return;
		if (
			isInteractiveElement(document.activeElement) &&
			document.activeElement !== document.body
		)
			return;
		event.preventDefault();
		randomize();
	});

	restoreState();
	syncToggles();
	primeSlotColumns();
	syncWinner();
	renderHistory();
})();
