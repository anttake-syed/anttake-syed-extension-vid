// Layout primitives — thin wrappers over the classes in styles/layout.css.
// Every page renders inside <Page>; see docs/UI_GUIDELINES.md for when to use which.

const cx = (...parts) => parts.filter(Boolean).join(' ');

/** Page container. width: 'narrow' (forms, legal text) | 'default' | 'wide' | 'full' */
export function Page({ width = 'default', className, children, ...rest }) {
  return (
    <div className={cx('page', width !== 'default' && `page--${width}`, className)} {...rest}>
      {children}
    </div>
  );
}

/** Title block + actions that wrap below the title instead of overflowing. */
export function SectionHead({ title, subtitle, actions, className, children }) {
  return (
    <div className={cx('section-head', className)}>
      <div>
        {title}
        {subtitle}
        {children}
      </div>
      {actions && <div className="cluster">{actions}</div>}
    </div>
  );
}

/** Vertical stack. gap is any CSS length, defaults to --space-4. */
export function Stack({ gap, className, style, children, as: Tag = 'div', ...rest }) {
  return (
    <Tag className={cx('stack', className)} style={gap ? { '--stack-gap': gap, ...style } : style} {...rest}>
      {children}
    </Tag>
  );
}

/** Wrapping horizontal group (buttons, pills, filters). */
export function Cluster({ gap, className, style, children, ...rest }) {
  return (
    <div className={cx('cluster', className)} style={gap ? { '--cluster-gap': gap, ...style } : style} {...rest}>
      {children}
    </div>
  );
}

/**
 * Grid.
 *   <Grid min="240px">  → as many columns as fit, each at least `min`
 *   <Grid cols={2|3|4}> → that many columns when the page is wide enough, 1 on phones
 */
export function Grid({ min, cols, gap, className, style, children, ...rest }) {
  const vars = { ...(min && { '--grid-min': min }), ...(gap && { '--grid-gap': gap }), ...style };
  return (
    <div className={cx(cols ? `grid-${cols}` : 'grid-auto', className)} style={vars} {...rest}>
      {children}
    </div>
  );
}

/** Wrap every <table> in this so wide tables scroll instead of widening the page. */
export function TableScroll({ className, children }) {
  return <div className={cx('table-scroll', className)}>{children}</div>;
}
