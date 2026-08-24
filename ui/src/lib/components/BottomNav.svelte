<script lang="ts">
	// The phone's primary navigation, Spotify-style: three equal destinations pinned to the bottom
	// edge where the thumb lives (UXPin/Material guidance: 3–5 items, icons + labels, obvious
	// active state). Replaces the hamburger drawer — primary destinations should never hide.
	import { page } from '$app/state';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Home01Icon, Search01Icon, LibraryIcon } from '@hugeicons/core-free-icons';

	const tabs = [
		{ href: '/', label: 'Home', icon: Home01Icon },
		{ href: '/search', label: 'Search', icon: Search01Icon },
		{ href: '/library', label: 'Library', icon: LibraryIcon }
	];
	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<!-- pb: clear Android/iOS gesture bars. Row is 66px so each tap target clears Material's 48dp. -->
<nav class="shrink-0 border-t bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground">
	<div class="flex h-[4.125rem]">
		{#each tabs as t (t.href)}
			<a
				href={t.href}
				aria-current={isActive(t.href) ? 'page' : undefined}
				class="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors {isActive(
					t.href
				)
					? 'text-primary'
					: 'text-sidebar-foreground/60 active:bg-sidebar-accent/50'}"
			>
				<HugeiconsIcon icon={t.icon} strokeWidth={2} class="h-6 w-6" />
				<span class="text-[11px] font-medium">{t.label}</span>
			</a>
		{/each}
	</div>
</nav>
