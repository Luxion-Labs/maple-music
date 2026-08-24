<script lang="ts">
	// YT Music-style hamburger drawer for phones: primary destinations stay in BottomNav (never
	// hidden), this carries the depth the tab bar can't — the full playlist list and settings.
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { page } from '$app/state';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Home01Icon,
		Search01Icon,
		LibraryIcon,
		Settings01Icon,
		MusicNote01Icon,
		ListRestartIcon
	} from '@hugeicons/core-free-icons';
	import { ON_REPEAT_ID, type BrowseItem } from '$lib/api';
	import { thumb } from '$lib/thumb';
	import { auth, library, personal, ui, loadLibrary } from '$lib/player.svelte';
	import { mergeSaved, orderLibrary } from '$lib/personal';

	let { open, onClose }: { open: boolean; onClose: () => void } = $props();

	const nav = [
		{ href: '/', label: 'Home', icon: Home01Icon },
		{ href: '/search', label: 'Search', icon: Search01Icon },
		{ href: '/library', label: 'Library', icon: LibraryIcon }
	];
	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);

	// Same ordering rule as the desktop sidebar: pins first, then last-played; local saves mixed in.
	const playlists = $derived(
		orderLibrary(mergeSaved(personal, library.items.filter((i) => i.kind !== 'song'), 'playlist'), personal)
	);

	// Fetch on first open so a fresh install shows its playlists without a Library visit.
	$effect(() => {
		if (open) loadLibrary();
	});

	const playlistHref = (item: BrowseItem) =>
		item.kind === 'album'
			? `/album/${encodeURIComponent(item.id)}`
			: item.kind === 'artist'
				? `/artist/${encodeURIComponent(item.id)}`
				: `/playlist/${encodeURIComponent(item.id)}`;
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') onClose();
	}}
/>

{#if open}
	<button
		class="fixed inset-0 z-40 cursor-default bg-black/50"
		transition:fade={{ duration: 150 }}
		onclick={onClose}
		aria-label="Close menu"
	></button>
	<div
		class="fixed inset-y-0 left-0 z-50 flex w-[min(80vw,20rem)] flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl pb-[env(safe-area-inset-bottom)]"
		transition:fly={{ x: -320, duration: 220, easing: cubicOut }}
	>
		<div class="flex h-12 shrink-0 items-center gap-2 border-b px-4">
			<span class="font-heading text-lg font-bold tracking-tight">Maple</span>
			{#if auth.account?.signedIn}
				<span class="ml-auto truncate text-xs text-muted-foreground">
					{auth.account.name ?? ''}
				</span>
			{/if}
		</div>

		<nav class="shrink-0 p-2">
			{#each nav as n (n.href)}
				<a
					href={n.href}
					onclick={onClose}
					aria-current={isActive(n.href) ? 'page' : undefined}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors {isActive(
						n.href
					)
						? 'bg-sidebar-accent font-medium text-primary'
						: 'hover:bg-sidebar-accent/50'}"
				>
					<HugeiconsIcon icon={n.icon} strokeWidth={2} class="h-5 w-5 shrink-0" />
					{n.label}
				</a>
			{/each}
		</nav>

		<div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
			{#if playlists.length}
				<p class="px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Playlists
				</p>
				{#each playlists as pl (pl.id)}
					<a
						href={playlistHref(pl)}
						onclick={onClose}
						title={pl.title}
						class="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/50"
					>
						<div class="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
							{#if pl.thumbnail && pl.id !== ON_REPEAT_ID}
								<img
									src={thumb(pl.thumbnail, 96)}
									alt=""
									class="h-full w-full object-cover"
									loading="lazy"
								/>
							{:else if pl.id === ON_REPEAT_ID}
								<div class="flex h-full w-full items-center justify-center text-muted-foreground">
									<HugeiconsIcon
										icon={ListRestartIcon}
										showAlt={pl.id === ON_REPEAT_ID}
										altIcon={MusicNote01Icon}
										class="h-5 w-5"
									/>
								</div>
							{:else}
								<div class="flex h-full w-full items-center justify-center text-muted-foreground">
									<HugeiconsIcon icon={MusicNote01Icon} class="h-5 w-5" />
								</div>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<div class="truncate text-sm font-medium">{pl.title}</div>
							{#if pl.subtitle}
								<div class="truncate text-xs text-muted-foreground">{pl.subtitle}</div>
							{/if}
						</div>
					</a>
				{/each}
			{:else if auth.account?.signedIn || library.items.length}
				<p class="px-3 py-6 text-center text-xs text-muted-foreground">No playlists yet.</p>
			{/if}
		</div>

		<div class="shrink-0 border-t p-2">
			<button
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent/50"
				onclick={() => {
					onClose();
					ui.settingsOpen = true;
				}}
			>
				<HugeiconsIcon icon={Settings01Icon} strokeWidth={2} class="h-5 w-5 shrink-0" />
				Settings
			</button>
		</div>
	</div>
{/if}
