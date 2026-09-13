"use client";

import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { ClippedCircle } from "#/components/ui/clipped-circle.tsx";
import { Tilt, type TiltProps } from "#/components/ui/tilt.tsx";
import { cn } from "#/lib/utils.ts";

export type TiltCardProps = HTMLAttributes<HTMLDivElement> & {
	title: string;
	description?: string;
	/** left half of the split badge pill; shown as a simple pill if `badgeLabel` is omitted */
	price?: string;
	/** right half of the split pill, coloured by `badgeVariant` */
	badgeLabel?: string;
	badgeVariant?: "success" | "warning";
	imageSrc?: string;
	imageAlt?: string;
	/** wraps the card in a plain `<a>` tag */
	href?: string;
	children?: ReactNode;
	tiltProps?: Omit<TiltProps, "children" | "className">;
};

const BADGE_LABEL_CLASSES: Record<
	NonNullable<TiltCardProps["badgeVariant"]>,
	string
> = {
	success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
	warning: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
};

export function TiltCard({
	title,
	description,
	price,
	badgeLabel,
	badgeVariant = "success",
	imageSrc,
	imageAlt = "",
	href,
	children,
	tiltProps,
	className,
	...props
}: TiltCardProps) {
	const inner = (
		<Tilt
			rotationFactor={11}
			{...tiltProps}
			className={cn(
				"relative group overflow-hidden",
				"bg-background border border-border rounded-lg",
				"flex flex-col gap-4",
				"h-48 sm:h-52 md:h-56 w-full",
				"transition-[border-color,transform] duration-300 ease-out hover:border-[#171715] hover:scale-[1.015] motion-reduce:transform-none",
				className,
			)}
		>
			<div className="relative z-20 flex flex-row justify-between px-4 py-4 transition-colors duration-300 delay-100 group-hover:text-primary-foreground sm:px-6 sm:py-5">
				<div className="flex flex-col gap-1 flex-1 mr-2">
					<h2 className="text-lg tracking-tight leading-tight font-medium">
						{title}
					</h2>
					{description && (
						<p className="text-sm text-foreground/50 transition-colors group-hover:text-primary-foreground/70">
							{description}
						</p>
					)}
					{children && <div className="mt-2">{children}</div>}
				</div>

				{price && badgeLabel ? (
					<div className="inline-flex h-fit items-center text-sm whitespace-nowrap shrink-0">
						<span className="rounded-l-full bg-secondary h-fit py-1 px-2 font-medium">
							{price}
						</span>
						<span
							className={cn(
								"rounded-r-full text-sm h-fit py-1 px-2 font-medium",
								BADGE_LABEL_CLASSES[badgeVariant],
							)}
						>
							{badgeLabel}
						</span>
					</div>
				) : price ? (
					<span className="h-fit rounded-full bg-secondary px-3 py-1 text-sm font-medium whitespace-nowrap shrink-0">
						{price}
					</span>
				) : null}
			</div>

			{imageSrc && (
				<img
					src={imageSrc}
					alt={imageAlt}
					width={288}
					height={224}
					loading="lazy"
					decoding="async"
					className={cn(
						"absolute z-10 top-27 w-72 -right-10",
						"rotate-[-5deg] border-border border rounded-md",
						"transition-transform duration-300 ease-out",
						"group-hover:-rotate-3 group-hover:-translate-y-1 group-hover:-translate-x-0.5",
					)}
				/>
			)}

			<ClippedCircle
				className="z-0"
				circleClassName="bg-primary"
				circleSize={800}
				mixBlendMode="normal"
			/>
		</Tilt>
	);

	if (href) {
		return (
			<a
				href={href}
				className="block cursor-pointer"
				{...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
			>
				{inner}
			</a>
		);
	}

	return <div {...props}>{inner}</div>;
}
