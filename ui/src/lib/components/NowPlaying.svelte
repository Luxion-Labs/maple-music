<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { beforeNavigate } from '$app/navigation';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Maximize01Icon,
		Minimize01Icon,
		Mic01Icon,
		MusicNote01Icon,
		PlayIcon,
		PauseIcon,
		Queue01Icon,
		ArrowDown01Icon,
		PreviousIcon,
		NextIcon,
		ShuffleIcon,
		RepeatIcon,
		RepeatOne01Icon
	} from '@hugeicons/core-free-icons';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import * as api from '$lib/api';
	import { cycleRepeat, np, playback, ui } from '$lib/player.svelte';
	import { appearance } from '$lib/theme.svelte';
	import { thumb } from '$lib/thumb';
	import { isMobile } from '$lib/mobile.svelte';
	import Marquee from './Marquee.svelte';
	import ArtistLine from './ArtistLine.svelte';
	import QueueList from './QueueList.svelte';
	import LyricsView from './LyricsView.svelte';

	// Off in settings, this view drops its tabs and the queue/lyrics panels stay in charge of both
	// (see +layout): they paint above this (z-30 over z-20), so all this needs is to hand back the
	// width they take at lg+ instead of letting them cover a third of the artwork. Below lg they're
	// a scrimmed overlay and there's nothing to shrink into. In tabbed mode both are always closed.
	let { queueOpen, lyricsOpen }: { queueOpen: boolean; lyricsOpen: boolean } = $props();
	const tabbed = $derived(appearance.tabbedPlayer);
	// ponytail: mirrors QueuePanel / LyricsPanel's w-80, keep in sync if those change.
	const panels = $derived(Number(queueOpen) + Number(lyricsOpen));
	const inset = $derived(['', 'lg:right-80', 'lg:right-[40rem]'][panels]);

	// Going somewhere means the user wants that page, not this one: minimise. The player bar brings
	// it back. beforeNavigate (not a pathname effect) so clicking the tab you're already on counts.
	beforeNavigate(() => (np.open = false));

	// Enlarged lyrics take the whole view, artwork column and tab strip included. A class swap
	// rather than unmounting the tabs: LyricsView must survive it or it refetches and loses its
	// scroll position.
	let big = $state(false);
	$effect(() => {
		if (np.tab !== 'lyrics') big = false; // nothing to enlarge on the queue tab
	});

	// Google's CDN doesn't serve every rewritten size for every image (see MediaCard), and at this
	// size a broken-image glyph *is* the page. So step down until one loads: crisp, then the size
	// proven everywhere else in the app, then the 120 the player bar is already showing for this
	// very track, and only then a music note.
	let attempt = $state(0);
	let bgFailed = $state(false);
	$effect(() => {
		playback.now?.thumbnail; // re-arm on every track change
		attempt = 0;
		bgFailed = false;
	});
	const srcs = $derived([720, 400, 120].map((px) => thumb(playback.now?.thumbnail, px)));
	const src = $derived(srcs[attempt]);
	const imgFailed = () => attempt++;

	// Mobile full-screen: the queue/lyrics sheet slides up from the bottom of the view.
	let sheet = $state(false);

	// Seek + transport state for the mobile control row (mirrors PlayerBar's guard: while
	// dragging, hold a local value so mpv position ticks can't yank the thumb back).
	const shuffleOn = $derived(playback.queue.shuffle ?? false);
	const repeat = $derived(playback.queue.repeat ?? 'off');
	const fmt = (secs: number) => {
		if (!secs || secs < 0) return '0:00';
		const t = Math.floor(secs);
		const h = Math.floor(t / 3600);
		const m = Math.floor((t % 3600) / 60);
		const s = t % 60;
		const mm = h ? m.toString().padStart(2, '0') : `${m}`;
		return `${h ? `${h}:` : ''}${mm}:${s.toString().padStart(2, '0')}`;
	};
	let seekDrag = $state<number | null>(null);
	const shownPosition = $derived(seekDrag ?? playback.position);
	function onSeekInput(e: Event) {
		seekDrag = Number((e.target as HTMLInputElement).value);
	}
	function onSeekCommit(e: Event) {
		const v = Number((e.target as HTMLInputElement).value);
		playback.position = v;
		seekDrag = null;
		api.seek(v);
	}

	// Clicking the artwork toggles playback, and flashes the action just taken over it so the click
	// visibly did something. Read `paused` before the toggle: the backend event that flips it is a
	// round trip away, and the icon has to be right on the frame the user clicked.
	let flash: 'play' | 'pause' | null = $state(null);
	let flashTimer: ReturnType<typeof setTimeout>;
	function toggle() {
		flash = playback.paused ? 'play' : 'pause';
		clearTimeout(flashTimer);
		flashTimer = setTimeout(() => (flash = null), 220);
		api.togglePause();
	}
</script>

{#if isMobile}
	<!-- Phone: the full-screen view Spotify-style. Covers everything including the mini-player
	     and tab bar (fixed, z-40), so it carries its own transport row and a collapsible
	     queue/lyrics sheet — on desktop those live in the bar/columns below, which are hidden
	     behind this. Safe-area padding keeps controls clear of camera punch-holes and gestures. -->
	<div
		transition:fly={{ y: '100%', duration: 320, easing: cubicOut }}
		class="fixed inset-0 z-40 flex flex-col overflow-hidden bg-background px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]"
	>
		{#if appearance.artworkBackground && srcs[2] && !bgFailed}
			<img
				src={srcs[2]}
				alt=""
				onerror={() => (bgFailed = true)}
				class="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl dark:opacity-40"
			/>
		{/if}

		<header class="relative flex items-center justify-between">
			<Button variant="ghost" size="icon" class="size-11" onclick={() => (np.open = false)} aria-label="Minimise">
				<HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} class="h-6 w-6" />
			</Button>
			<span class="text-xs font-medium uppercase tracking-widest text-muted-foreground">Now Playing</span>
			<Button
				variant="ghost"
				size="icon"
				class="size-11"
				onclick={() => (sheet = !sheet)}
				aria-label={sheet ? 'Hide queue' : 'Show queue'}
				aria-expanded={sheet}
			>
				<HugeiconsIcon icon={Queue01Icon} strokeWidth={2} class="h-6 w-6" />
			</Button>
		</header>

		<button
			type="button"
			onclick={toggle}
			aria-label="Play/pause"
			class="relative mx-auto my-4 w-full max-w-[var(--art)] cursor-pointer self-center"
			style="--art:min(100%, calc(100dvh - 26rem))"
		>
			{#if flash}
				<div
					in:scale={{ start: 0.7, duration: 150, easing: cubicOut }}
					out:scale={{ start: 1.3, duration: 320, easing: cubicOut }}
					class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
				>
					<div class="rounded-full bg-black/55 p-3.5 text-white">
						<!-- icon frozen at mount → swap via showAlt -->
						<HugeiconsIcon icon={PauseIcon} altIcon={PlayIcon} showAlt={flash === 'play'} class="h-7 w-7" />
					</div>
				</div>
			{/if}
			{#if src && attempt < srcs.length}
				<img {src} alt="" onerror={imgFailed} class="aspect-square w-full rounded-2xl object-cover shadow-2xl" />
			{:else}
				<div class="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted text-muted-foreground/40">
					<HugeiconsIcon icon={MusicNote01Icon} class="h-16 w-16" />
				</div>
			{/if}
		</button>

		<div class="relative min-w-0 text-center">
			<Marquee text={playback.now?.title ?? ''} class="justify-center text-lg font-semibold" />
			<ArtistLine
				runs={playback.now?.artistRuns}
				text={playback.now?.artists ?? ''}
				class="mt-0.5 block truncate text-sm text-muted-foreground"
			/>
		</div>

		<div class="relative mt-4 flex items-center gap-2 text-xs text-muted-foreground">
			<span class="tabular-nums">{fmt(shownPosition)}</span>
			<input
				type="range"
				class="range flex-1"
				style="--pct:{playback.duration ? (shownPosition / playback.duration) * 100 : 0}%"
				min="0"
				max={playback.duration || 0}
				value={shownPosition}
				oninput={onSeekInput}
				onchange={onSeekCommit}
				aria-label="Seek"
			/>
			<span class="tabular-nums">{fmt(playback.duration)}</span>
		</div>

		<div class="relative mt-2 flex items-center justify-between px-2">
			<Button variant="ghost" size="icon" class="size-12" onclick={() => api.toggleShuffle()} aria-label="Shuffle" aria-pressed={shuffleOn}>
				<HugeiconsIcon icon={ShuffleIcon} class="h-5 w-5 {shuffleOn ? 'text-primary' : 'text-muted-foreground'}" />
			</Button>
			<Button variant="ghost" size="icon" class="size-14" onclick={() => api.prevTrack()} aria-label="Previous">
				<HugeiconsIcon icon={PreviousIcon} class="h-7 w-7" />
			</Button>
			<Button variant="default" size="icon" class="size-16 rounded-full" onclick={() => api.togglePause()} aria-label="Play/pause">
				<HugeiconsIcon icon={PauseIcon} altIcon={PlayIcon} showAlt={playback.paused} class="h-8 w-8" />
			</Button>
			<Button variant="ghost" size="icon" class="size-14" onclick={() => api.nextTrack()} aria-label="Next">
				<HugeiconsIcon icon={NextIcon} class="h-7 w-7" />
			</Button>
			<Button variant="ghost" size="icon" class="size-12" onclick={cycleRepeat} aria-label="Repeat: {repeat}" aria-pressed={repeat !== 'off'}>
				<!-- swap via altIcon/showAlt — `icon` freezes at mount -->
				<HugeiconsIcon
					icon={RepeatIcon}
					altIcon={RepeatOne01Icon}
					showAlt={repeat === 'one'}
					class="h-5 w-5 {repeat !== 'off' ? 'text-primary' : 'text-muted-foreground'}"
				/>
			</Button>
		</div>

		{#if sheet}
			<div class="relative mt-4 flex min-h-0 flex-col overflow-hidden rounded-t-2xl border bg-card/95 backdrop-blur" style="height:38vh">
				<Tabs.Root value={np.tab} onValueChange={(v) => (np.tab = v as typeof np.tab)} class="flex min-h-0 flex-1 flex-col">
					<Tabs.List class="shrink-0 px-3 pt-1">
						<Tabs.Trigger value="queue" class="gap-2"><HugeiconsIcon icon={Queue01Icon} class="h-4 w-4" /> Queue</Tabs.Trigger>
						<Tabs.Trigger value="lyrics" class="gap-2"><HugeiconsIcon icon={Mic01Icon} class="h-4 w-4" /> Lyrics</Tabs.Trigger>
					</Tabs.List>
					{#if np.tab === 'queue'}
						<Tabs.Content value="queue" class="flex min-h-0 flex-1 flex-col"><QueueList /></Tabs.Content>
					{:else}
						<Tabs.Content value="lyrics" class="flex min-h-0 flex-1 flex-col"><LyricsView /></Tabs.Content>
					{/if}
				</Tabs.Root>
			</div>
		{/if}
	</div>
{:else}
<!-- Covers the page but not the sidebar (you navigate away to minimise) and not the player bar,
     which stays in charge of transport and paints above this on the way in and out.
     z-20 matches the highest a page uses for its own chrome (home's sticky mood chips) and wins the
     tie on DOM order, since <main> is static and its z-indexes land in the same stacking context.
     The player bar and the queue/lyrics panels come later/higher, so they still paint above.
     ponytail: left offsets mirror Sidebar's w-16/lg:w-60 (and its manual collapse) — keep in sync
     if those change. -->
<div
	transition:fly={{ y: '100%', duration: 320, easing: cubicOut }}
	class="absolute inset-y-0 left-16 right-0 z-20 flex justify-center overflow-hidden bg-background px-4 py-4 sm:px-6 sm:py-6 lg:px-10 {ui.sidebarCollapsed
		? ''
		: 'lg:left-60'} {inset}"
>
	<!-- The artwork itself, blurred to a wash, is the background: same trick as HomeHero, and it
	     needs no colour extraction (which a remote image would taint the canvas for anyway). The
	     120px variant is the one the player bar has already loaded for this track, so this costs
	     no request and nothing new to decode.
	     Two opacities because the wash sits on opposite grounds: over white it has to stay pale
	     enough for dark text, over near-black it can carry more colour before muted-foreground
	     stops reading. Turn them up together if it's too subtle. -->
	{#if appearance.artworkBackground && srcs[2] && !bgFailed}
		<img
			src={srcs[2]}
			alt=""
			onerror={() => (bgFailed = true)}
			class="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl dark:opacity-40"
		/>
	{/if}

	<!-- Capped and centred, so a wide window doesn't park the artwork in the middle of an empty half
	     with the tabs glued to the right edge. --art is the artwork's side: whichever is smaller of
	     the column's width and the height left over once the titlebar, the player bar and this
	     padding have had theirs, at 75% so the square doesn't dominate the view.
	     ponytail: 11rem is those three measured, not computed. The 0.75 leaves it plenty of slack
	     now, so only a much taller player bar would need it raised. -->
	<div
		class="relative flex w-full max-w-[80rem] gap-6 xl:gap-10"
		style="--art:calc(min(100%,100vh - 11rem) * 0.75)"
	>
		{#if !big}
			<!-- Centred against the full height of the column on the right. Below md there isn't room
			     for both columns, and the queue wins. Untabbed there is no second column, so the
			     artwork is the whole view at every width. -->
			<div
				class="min-w-0 flex-1 items-center justify-center {tabbed ? 'hidden md:flex' : 'flex'}"
			>
				<button
					type="button"
					onclick={toggle}
					aria-label="Play/pause"
					class="relative w-full max-w-[var(--art)] cursor-pointer"
				>
					{#if flash}
						<!-- No backdrop-blur: re-blurring the plate on every frame of the scale is what made
						     this stutter on WebKitGTK. Transform and opacity only. -->
						<div
							in:scale={{ start: 0.7, duration: 150, easing: cubicOut }}
							out:scale={{ start: 1.3, duration: 320, easing: cubicOut }}
							class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
						>
							<div class="rounded-full bg-black/55 p-3.5 text-white">
								<!-- icon is frozen at mount, so swap via showAlt, not a ternary. -->
								<HugeiconsIcon
									icon={PauseIcon}
									altIcon={PlayIcon}
									showAlt={flash === 'play'}
									class="h-7 w-7"
								/>
							</div>
						</div>
					{/if}
					{#if src && attempt < srcs.length}
						<img
							{src}
							alt=""
							onerror={imgFailed}
							class="aspect-square w-full rounded-2xl object-cover shadow-2xl"
						/>
					{:else}
						<div
							class="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted text-muted-foreground/40"
						>
							<HugeiconsIcon icon={MusicNote01Icon} class="h-16 w-16" />
						</div>
					{/if}
				</button>
			</div>
		{/if}

		{#if tabbed}
			<div class="flex min-h-0 flex-col {big ? 'flex-1' : 'w-full md:w-[22rem] xl:w-[26rem]'}">
				<Tabs.Root
					value={np.tab}
					onValueChange={(v) => (np.tab = v as typeof np.tab)}
					class="min-h-0 flex-1"
				>
					<div class="flex items-center gap-2 {big ? 'justify-end' : ''}">
						<!-- Same two glyphs the player bar uses for the queue and lyrics buttons. -->
						<Tabs.List class={big ? 'hidden' : 'flex-1'}>
							<Tabs.Trigger value="queue" class="gap-2.5">
								<HugeiconsIcon icon={Queue01Icon} class="h-4 w-4" /> Queue
							</Tabs.Trigger>
							<Tabs.Trigger value="lyrics" class="gap-2.5">
								<HugeiconsIcon icon={Mic01Icon} class="h-4 w-4" /> Lyrics
							</Tabs.Trigger>
						</Tabs.List>
						{#if np.tab === 'lyrics'}
							<button
								onclick={() => (big = !big)}
								class="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
								aria-label={big ? 'Shrink lyrics' : 'Enlarge lyrics'}
							>
								<!-- icon swap via altIcon/showAlt: `icon` is frozen at mount -->
								<HugeiconsIcon
									icon={Maximize01Icon}
									altIcon={Minimize01Icon}
									showAlt={big}
									class="h-4 w-4"
								/>
							</button>
						{/if}
					</div>
					<!-- Only the open tab is mounted: bits-ui keeps inactive content in the DOM, which would
					     leave LyricsView fetching lyrics for every track you never asked to see. -->
					{#if np.tab === 'queue'}
						<Tabs.Content value="queue" class="flex min-h-0 flex-col">
							<QueueList />
						</Tabs.Content>
					{:else}
						<Tabs.Content value="lyrics" class="flex min-h-0 flex-col">
							<LyricsView expanded={big} />
						</Tabs.Content>
					{/if}
				</Tabs.Root>
			</div>
		{/if}
	</div>
</div>
{/if}
