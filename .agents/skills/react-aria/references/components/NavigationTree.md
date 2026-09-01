# NavigationTree

A NavigationTree provides users with a way to navigate a nested, hierarchical set of links.

## Vanilla CSS example

```tsx
import {NavigationTree, NavigationTreeItem, NavigationTreeItemContent, NavigationTreeItemLink} from 'vanilla-starter/NavigationTree';
import {Button} from 'vanilla-starter/Button';
import {MoreHorizontal} from 'lucide-react';
import {RoutedNavigationTree} from './RoutedNavigationTree';

<RoutedNavigationTree defaultSelectedRoute="/photos">
  {({selectedRoute}) => (
    <NavigationTree aria-label="Files" selectedRoute={selectedRoute} defaultExpandedKeys={['files']}>
      <NavigationTreeItem id="home" href="/home" textValue="Home">
        <NavigationTreeItemContent>
          <NavigationTreeItemLink>Home</NavigationTreeItemLink>
          <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
        </NavigationTreeItemContent>
      </NavigationTreeItem>
      <NavigationTreeItem id="files" href="/files" textValue="Files">
        <NavigationTreeItemContent>
          <NavigationTreeItemLink>Files</NavigationTreeItemLink>
          <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
        </NavigationTreeItemContent>
        <NavigationTreeItem id="photos" href="/photos" textValue="Photos">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Photos</NavigationTreeItemLink>
            <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
        <NavigationTreeItem id="videos" href="/videos" textValue="Videos">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Videos</NavigationTreeItemLink>
            <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
      </NavigationTreeItem>
      <NavigationTreeItem id="shared" textValue="Shared">
        <NavigationTreeItemContent>
          <NavigationTreeItemLink>Shared</NavigationTreeItemLink>
          <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
        </NavigationTreeItemContent>
        <NavigationTreeItem id="food" href="/food" textValue="Food">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Food</NavigationTreeItemLink>
            <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
        <NavigationTreeItem id="drinks" href="/drinks" textValue="Drinks">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Drinks</NavigationTreeItemLink>
            <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
      </NavigationTreeItem>
    </NavigationTree>
  )}
</RoutedNavigationTree>
```

### NavigationTree.tsx

```tsx
'use client';
import {
  Button,
  Link,
  type LinkProps,
  NavigationTree as AriaNavigationTree,
  NavigationTreeHeader as AriaNavigationTreeHeader,
  type NavigationTreeHeaderProps,
  NavigationTreeItem as AriaNavigationTreeItem,
  NavigationTreeItemContent as AriaNavigationTreeItemContent,
  type NavigationTreeItemContentRenderProps,
  type NavigationTreeItemProps as AriaNavigationTreeItemProps,
  type NavigationTreeProps,
  NavigationTreeSection as AriaNavigationTreeSection,
  type NavigationTreeSectionProps
} from 'react-aria-components/NavigationTree';
import {ChevronRight} from 'lucide-react';
import React from 'react';
import './NavigationTree.css';

export function NavigationTree<T>(props: NavigationTreeProps<T>) {
  return <AriaNavigationTree {...props} />;
}

export function NavigationTreeItemContent(props: {children?: React.ReactNode}) {
  return (
    <AriaNavigationTreeItemContent>
      {({hasChildItems}: NavigationTreeItemContentRenderProps) => (
        <>
          {props.children}
          <Button
            slot="chevron"
            isDisabled={!hasChildItems}
            style={{visibility: hasChildItems ? undefined : 'hidden'}}>
            <ChevronRight aria-hidden />
          </Button>
        </>
      )}
    </AriaNavigationTreeItemContent>
  );
}

export function NavigationTreeItem(props: AriaNavigationTreeItemProps) {
  return <AriaNavigationTreeItem {...props} />;
}

export function NavigationTreeSection<T extends object>(props: NavigationTreeSectionProps<T>) {
  return <AriaNavigationTreeSection {...props} />;
}

export function NavigationTreeHeader(props: NavigationTreeHeaderProps) {
  return <AriaNavigationTreeHeader {...props} />;
}

export function NavigationTreeItemLink(props: LinkProps) {
  return <Link {...props} />;
}

```

### NavigationTree.css

```css
@import './theme.css';

.react-aria-NavigationTree {
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: var(--spacing-1);
  border: 0.5px solid var(--border-color);
  border-radius: calc(var(--radius) + var(--spacing-1));
  background: var(--overlay-background);
  forced-color-adjust: none;
  outline: none;
  width: 250px;
  max-height: 300px;
  box-sizing: border-box;

  &[data-focus-visible] {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: -1px;
  }

  .react-aria-NavigationTreeSection:not(:first-child) {
    margin-top: var(--spacing-4);
  }

  .react-aria-NavigationTreeHeader {
    font-size: var(--font-size-sm);
    font-weight: 600;
    padding: var(--spacing-1) var(--spacing-2);
    color: var(--text-color);
  }
}

.react-aria-NavigationTreeItem {
  --padding: var(--spacing-4);
  display: flex;
  position: relative;
  align-items: center;
  min-height: var(--spacing-8);
  border-radius: var(--radius);
  box-sizing: border-box;
  outline: none;
  color: var(--text-color);
  font: var(--font-size) system-ui;
  -webkit-tap-highlight-color: transparent;
  /* Indent each nested level. --tree-item-level is set on the row by React Aria (1-based). */
  padding-inline-start: calc((var(--tree-item-level, 1) - 1) * var(--padding));

  .react-aria-Link:before {
    display: none;
    content: '';
    position: absolute;
    inset-inline-start: 2px;
    top: 50%;
    width: 2px;
    transform: translateY(-50%);
    height: 1lh;
    background: var(--text-color-hover);
    font-weight: 600;
    border-radius: 9999px;
  }

  a.react-aria-Link[data-hovered]:before {
    display: block;
  }

  /* When a current-route ancestor is collapsed, tint it and show a small dot where the pill would be.
   * The dot (rather than the full pill) signals "the current route is nested inside here" without
   * looking selected, and gives a non-color affordance. Higher specificity than the hover rule above,
   * so the dot wins over the hover pill on these rows. Targets .react-aria-Link so it works whether the
   * row renders as a link or a plain span. */
  &[data-current-ancestor]:not([data-expanded]) {
    .react-aria-Link:before {
      display: block;
      height: 4px;
      width: 4px;
    }
  }

  /* React Aria sets data-current on the link matching the NavigationTree's selectedRoute. */
  &[data-current] .react-aria-Link:before {
    display: block;
    background: var(--highlight-background);
  }

  &[data-focus-visible] {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: -2px;
  }

  &[data-disabled] {
    color: var(--text-color-disabled);
  }

  .react-aria-Link {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-width: 0;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius);
    color: inherit;
    text-decoration: none;
    outline: none;
    cursor: pointer;
  }

  /* A row without an href renders its label as a non-interactive span. */
  &:not([data-href]) .react-aria-Link {
    cursor: default;
  }

  .react-aria-Button[slot='chevron'] {
    all: unset;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--spacing-6);
    height: var(--spacing-6);
    border-radius: var(--radius);
    cursor: default;
    -webkit-tap-highlight-color: transparent;

    svg {
      width: var(--spacing-4);
      height: var(--spacing-4);
      rotate: 0deg;
      transition: rotate 200ms;
    }

    &[data-focus-visible] {
      outline: 2px solid var(--focus-ring-color);
    }
  }

  &[data-expanded] .react-aria-Button[slot='chevron'] svg {
    rotate: 90deg;
  }
}

@media (forced-colors: active) {
  .react-aria-NavigationTreeItem a.react-aria-Link {
    color: LinkText;
  }
}

```

### RoutedNavigationTree.tsx

```tsx
'use client';
import {RouterProvider} from 'react-aria-components';
import React, {ReactNode, useState} from 'react';

export function RoutedNavigationTree(props: {
  children: ({selectedRoute}: {selectedRoute: string}) => ReactNode;
  defaultSelectedRoute: string;
}) {
  let {children} = props;
  let [selectedRoute, setSelectedRoute] = useState<string>(props.defaultSelectedRoute);

  let updateSelection = (href: string) => {
    setSelectedRoute(href);
  };

  return <RouterProvider navigate={updateSelection}>{children({selectedRoute})}</RouterProvider>;
}

```

## Tailwind example

```tsx
import {NavigationTree, NavigationTreeItem, NavigationTreeItemContent, NavigationTreeItemLink} from 'tailwind-starter/NavigationTree';
import {Button} from 'tailwind-starter/Button';
import {MoreHorizontal} from 'lucide-react';
import {RoutedNavigationTree} from './RoutedNavigationTree';

<RoutedNavigationTree defaultSelectedRoute="/photos">
  {({selectedRoute}) => (
    <NavigationTree aria-label="Files" selectedRoute={selectedRoute} defaultExpandedKeys={['files']}>
      <NavigationTreeItem id="home" href="/home" textValue="Home">
        <NavigationTreeItemContent>
          <NavigationTreeItemLink>Home</NavigationTreeItemLink>
          <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
        </NavigationTreeItemContent>
      </NavigationTreeItem>
      <NavigationTreeItem id="files" href="/files" textValue="Files">
        <NavigationTreeItemContent>
          <NavigationTreeItemLink>Files</NavigationTreeItemLink>
          <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
        </NavigationTreeItemContent>
        <NavigationTreeItem id="photos" href="/photos" textValue="Photos">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Photos</NavigationTreeItemLink>
            <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
        <NavigationTreeItem id="videos" href="/videos" textValue="Videos">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Videos</NavigationTreeItemLink>
            <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
      </NavigationTreeItem>
      <NavigationTreeItem id="shared" textValue="Shared">
        <NavigationTreeItemContent>
          <NavigationTreeItemLink>Shared</NavigationTreeItemLink>
          <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
        </NavigationTreeItemContent>
        <NavigationTreeItem id="food" href="/food" textValue="Food">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Food</NavigationTreeItemLink>
            <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
        <NavigationTreeItem id="drinks" href="/drinks" textValue="Drinks">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Drinks</NavigationTreeItemLink>
            <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
      </NavigationTreeItem>
    </NavigationTree>
  )}
</RoutedNavigationTree>
```

### NavigationTree.tsx

```tsx
'use client';
import {
  Button,
  Link,
  type LinkProps,
  NavigationTree as AriaNavigationTree,
  NavigationTreeHeader as AriaNavigationTreeHeader,
  type NavigationTreeHeaderProps,
  NavigationTreeItem as AriaNavigationTreeItem,
  NavigationTreeItemContent as AriaNavigationTreeItemContent,
  type NavigationTreeItemProps as AriaNavigationTreeItemProps,
  type NavigationTreeProps,
  NavigationTreeSection as AriaNavigationTreeSection,
  type NavigationTreeSectionProps
} from 'react-aria-components/NavigationTree';
import {ChevronRight} from 'lucide-react';
import React from 'react';
import {tv} from 'tailwind-variants';
import {composeTailwindRenderProps, focusRing} from './utils';

export function NavigationTree<T>({children, ...props}: NavigationTreeProps<T>) {
  return (
    <AriaNavigationTree
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        'w-56 max-w-full max-h-72 overflow-auto flex flex-col p-1 gap-0.5 relative border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 outline-none'
      )}>
      {children}
    </AriaNavigationTree>
  );
}

// The focus ring lives on the row (not the link) so it spans the whole item. Hover/current/ancestor
// state is surfaced as a leading-edge indicator (see indicatorStyles) rather than a full-row
// background. The row is a `group` so the indicator can react to the row's data-* attributes. isFocusVisible
// comes from the render props; RAC's isFocusVisible already follows the link (it is not true when
// another child, e.g. a button, is focused).
const itemStyles = tv({
  extend: focusRing,
  base: 'group relative font-sans flex items-center rounded-md cursor-default select-none text-neutral-800 dark:text-neutral-200 -outline-offset-2 [-webkit-tap-highlight-color:transparent]',
  variants: {
    isDisabled: {
      true: 'text-neutral-300 dark:text-neutral-600 forced-colors:text-[GrayText]'
    }
  }
});

const linkStyles = tv({
  base:
    'relative flex-1 min-w-0 flex items-center gap-2 py-1.5 px-2 text-sm no-underline text-current cursor-pointer outline-none ' +
    // A row without an href renders its label as a non-interactive span, so it should not look clickable.
    'group-[:not([data-href])]:cursor-default',
  variants: {
    isDisabled: {
      true: 'cursor-default'
    }
  }
});

// The leading-edge indicator is a real, presentational element (aria-hidden). Its variant is chosen in
// JS (see NavigationTreeItemContent) and surfaced as a single `data-indicator` attribute, so the styles
// stay flat and precedence lives in one place instead of relying on CSS specificity:
//   - current (blue pill): the selected row. Because the variant is picked in JS, it keeps this color
//     even while hovered.
//   - ancestor (neutral dot): a collapsed ancestor of the current route.
//   - hover (neutral pill): any actionable row on hover.
const indicatorStyles = tv({
  base:
    'absolute start-0.5 top-1/2 -translate-y-1/2 w-0.5 h-[1lh] rounded-full forced-color-adjust-none ' +
    // Only real link rows (the group row has data-href) get the hover pill.
    'group-[[data-href]]:data-[indicator=hover]:bg-neutral-400 dark:group-[[data-href]]:data-[indicator=hover]:bg-neutral-500 ' +
    'data-[indicator=current]:bg-blue-600 dark:data-[indicator=current]:bg-blue-400 ' +
    'data-[indicator=ancestor]:h-1 data-[indicator=ancestor]:w-1 data-[indicator=ancestor]:bg-neutral-400 dark:data-[indicator=ancestor]:bg-neutral-500 ' +
    // In forced-colors mode authored backgrounds are dropped, so render any visible state as Highlight.
    'forced-colors:data-[indicator]:bg-[Highlight]'
});

const expandButton = tv({
  extend: focusRing,
  base: 'shrink-0 w-6 h-6 flex items-center justify-center rounded-md border-0 p-0 bg-transparent cursor-default [-webkit-tap-highlight-color:transparent] -outline-offset-2'
});

const chevron = tv({
  base: 'w-4 h-4 text-neutral-500 dark:text-neutral-400 transition-transform duration-200 ease-in-out',
  variants: {
    isExpanded: {
      true: 'rotate-90'
    }
  }
});

const NavTreeLinkContext = React.createContext<{
  indicator: 'current' | 'ancestor' | undefined;
}>({indicator: undefined});

export function NavigationTreeItemContent(props: {children?: React.ReactNode}) {
  return (
    <AriaNavigationTreeItemContent>
      {({level, hasChildItems, isExpanded, isCurrent, isCurrentAncestor}) => {
        let indicator: 'current' | 'ancestor' | undefined;
        if (isCurrent) {
          indicator = 'current';
        } else if (isCurrentAncestor && !isExpanded) {
          indicator = 'ancestor';
        }
        return (
          <>
            {level > 1 && (
              <div
                className="shrink-0"
                style={{width: `calc((${level} - 1) * calc(var(--spacing) * 4))`}}
              />
            )}
            <NavTreeLinkContext.Provider value={{indicator}}>
              {props.children}
            </NavTreeLinkContext.Provider>
            <Button
              slot="chevron"
              isDisabled={!hasChildItems}
              className={({isFocusVisible}) =>
                expandButton({isFocusVisible, className: hasChildItems ? undefined : 'invisible'})
              }>
              <ChevronRight aria-hidden className={chevron({isExpanded})} />
            </Button>
          </>
        );
      }}
    </AriaNavigationTreeItemContent>
  );
}

export function NavigationTreeItem(props: AriaNavigationTreeItemProps) {
  return <AriaNavigationTreeItem className={itemStyles} {...props} />;
}

export function NavigationTreeSection<T extends object>(props: NavigationTreeSectionProps<T>) {
  return <AriaNavigationTreeSection {...props} className="not-first:mt-4" />;
}

export function NavigationTreeHeader(props: NavigationTreeHeaderProps) {
  return (
    <AriaNavigationTreeHeader
      {...props}
      className="px-2 py-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300"
    />
  );
}

export interface NavigationTreeItemLinkProps extends Omit<LinkProps, 'children'> {
  children?: React.ReactNode;
}

export function NavigationTreeItemLink(props: NavigationTreeItemLinkProps) {
  let {indicator} = React.useContext(NavTreeLinkContext);
  return (
    <Link {...props} className={({isDisabled}) => linkStyles({isDisabled})}>
      {({isHovered}) => (
        <>
          <span
            aria-hidden
            data-indicator={indicator ?? (isHovered ? 'hover' : undefined)}
            className={indicatorStyles()}
          />
          {props.children}
        </>
      )}
    </Link>
  );
}

```

### RoutedNavigationTree.tsx

```tsx
'use client';
import {RouterProvider} from 'react-aria-components';
import React, {ReactNode, useState} from 'react';

export function RoutedNavigationTree(props: {
  children: ({selectedRoute}: {selectedRoute: string}) => ReactNode;
  defaultSelectedRoute: string;
}) {
  let {children} = props;
  let [selectedRoute, setSelectedRoute] = useState<string>(props.defaultSelectedRoute);

  let updateSelection = (href: string) => {
    setSelectedRoute(href);
  };

  return <RouterProvider navigate={updateSelection}>{children({selectedRoute})}</RouterProvider>;
}

```

## Content

`NavigationTree` follows the [Collection Components API](../guides/collections.md?component=NavigationTree), accepting both static and dynamic collections. The example above shows a static collection. This example shows a dynamic collection, passing a list of objects to the `items` prop and a function to render the children.

```tsx
import {NavigationTree, NavigationTreeItem, NavigationTreeItemContent, NavigationTreeItemLink} from 'vanilla-starter/NavigationTree';
import {RoutedNavigationTree} from './RoutedNavigationTree';

function Example() {
  let items = [
    {id: 'overview', url: '/overview', label: 'Overview'},
    {id: 'reports', url: '/reports', label: 'Reports'},
    {id: 'settings', url: '/settings', label: 'Settings'}
  ];

  return (
    <RoutedNavigationTree defaultSelectedRoute="/reports">
      {({selectedRoute}) => (
        /*- begin highlight -*/
        <NavigationTree aria-label="Sections" items={items} selectedRoute={selectedRoute}>
          {item => (
            <NavigationTreeItem href={item.url} textValue={item.label}>
              <NavigationTreeItemContent>
                <NavigationTreeItemLink>{item.label}</NavigationTreeItemLink>
              </NavigationTreeItemContent>
            </NavigationTreeItem>
          )}
        </NavigationTree>
        /*- end highlight -*/
      )}
    </RoutedNavigationTree>
  );
}
```

<InlineAlert variant="notice">
  <Heading>Accessibility</Heading>
  <Content>`NavigationTree` renders as a tree so keyboard users can navigate and expand the hierarchy. When it acts as the main navigation for a page, place it inside a [navigation landmark](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html): wrap the `NavigationTree` in a `<nav>` element with an `aria-label` so assistive technology users can quickly find it.</Content>
</InlineAlert>

### Sections

Use `NavigationTreeSection` to group related items, with an optional `NavigationTreeHeader` to label each group. Sections without a header must have an `aria-label`.

```tsx
import {NavigationTree, NavigationTreeItem, NavigationTreeItemContent, NavigationTreeItemLink, NavigationTreeSection, NavigationTreeHeader} from 'vanilla-starter/NavigationTree';
import {RoutedNavigationTree} from './RoutedNavigationTree';

<RoutedNavigationTree defaultSelectedRoute="/projects/apollo">
  {({selectedRoute}) => (
    <NavigationTree aria-label="Workspace" selectedRoute={selectedRoute}>
      {/*- begin highlight -*/}
      <NavigationTreeSection>
        <NavigationTreeHeader>Personal</NavigationTreeHeader>
        <NavigationTreeItem href="/home" textValue="Home">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Home</NavigationTreeItemLink>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
        <NavigationTreeItem href="/starred" textValue="Starred">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Starred</NavigationTreeItemLink>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
      </NavigationTreeSection>
      {/*- end highlight -*/}
      <NavigationTreeSection>
        <NavigationTreeHeader>Projects</NavigationTreeHeader>
        <NavigationTreeItem href="/projects/apollo" textValue="Apollo">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Apollo</NavigationTreeItemLink>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
        <NavigationTreeItem href="/projects/gemini" textValue="Gemini">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Gemini</NavigationTreeItemLink>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
      </NavigationTreeSection>
    </NavigationTree>
  )}
</RoutedNavigationTree>
```

## Current route

Each `NavigationTreeItem` accepts an `href`. Set the `selectedRoute` prop on the `NavigationTree` to the current page's path, and the item whose `href` matches is marked with `aria-current="page"` (and a `data-current` attribute for styling).

Combine `NavigationTree` with a client side router by wrapping your app in a [RouterProvider](../guides/frameworks.md) so that activating a link updates the route. Then set `selectedRoute`. In this example the router navigation is stored in local state to show the current route updating as you activate links.

```tsx
import {NavigationTree, NavigationTreeItem, NavigationTreeItemContent, NavigationTreeItemLink} from 'vanilla-starter/NavigationTree';
import {RouterProvider} from 'react-aria-components';
import {useState} from 'react';

function Example() {
  let [route, setRoute] = useState('/inbox');
  return (
    /*- begin highlight -*/
    <RouterProvider navigate={setRoute}>
      {/*- end highlight -*/}
      <NavigationTree aria-label="Mail" selectedRoute={route}>
        <NavigationTreeItem href="/inbox" textValue="Inbox">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Inbox</NavigationTreeItemLink>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
        <NavigationTreeItem href="/drafts" textValue="Drafts">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Drafts</NavigationTreeItemLink>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
        <NavigationTreeItem href="/sent" textValue="Sent">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Sent</NavigationTreeItemLink>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
      </NavigationTree>
    </RouterProvider>
  );
}
```

## API

```tsx
<NavigationTree>
  <NavigationTreeSection>
    <NavigationTreeHeader />
    <NavigationTreeItem>
      <NavigationTreeItemContent>
        <Link />
        <Button slot="chevron" />
      </NavigationTreeItemContent>
    </NavigationTreeItem>
  </NavigationTreeSection>
</NavigationTree>
```

### NavigationTree

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `aria-describedby` | `string | undefined` | — | Identifies the element (or elements) that describes the object. |
| `aria-details` | `string | undefined` | — | Identifies the element (or elements) that provide a detailed, extended description for the object. |
| `aria-label` | `string | undefined` | — | Defines a string value that labels the current element. |
| `aria-labelledby` | `string | undefined` | — | Identifies the element (or elements) that labels the current element. |
| `autoFocus` | `boolean | FocusStrategy | undefined` | — | Whether to auto focus the gridlist or an option. |
| `children` | `((item: T) => ReactNode) | React.ReactNode` | — | The contents of the collection. |
| `className` | `ClassNameOrFunction<NavigationTreeRenderProps> | undefined` | 'react-aria-NavigationTree' | The CSS [className](https://developer.mozilla.org/en-US/docs/Web/API/Element/className) for the element. A function may be provided to compute the class based on component state. |
| `defaultExpandedKeys` | `Iterable<Key> | undefined` | — | The initial expanded keys in the collection (uncontrolled). |
| `dependencies` | `readonly any[] | undefined` | — | Values that should invalidate the item cache when using dynamic collections. |
| `dir` | `string | undefined` | — |  |
| `disabledKeys` | `Iterable<Key> | undefined` | — | The item keys that are disabled. These items cannot be selected, focused, or otherwise interacted with. |
| `expandedKeys` | `Iterable<Key> | undefined` | — | The currently expanded keys in the collection (controlled). |
| `hidden` | `boolean | undefined` | — |  |
| `id` | `string | undefined` | — | The element's unique identifier. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id). |
| `inert` | `boolean | undefined` | — |  |
| `items` | `Iterable<T> | undefined` | — | Item objects in the collection. |
| `lang` | `string | undefined` | — |  |
| `onAnimationEnd` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAnimationEndCapture` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAnimationIteration` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAnimationIterationCapture` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAnimationStart` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAnimationStartCapture` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAuxClick` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAuxClickCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onClick` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onClickCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onContextMenu` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onContextMenuCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onDoubleClick` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onDoubleClickCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onExpandedChange` | `((keys: Set<Key>) => any) | undefined` | — | Handler that is called when items are expanded or collapsed. |
| `onGotPointerCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onGotPointerCaptureCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onLostPointerCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onLostPointerCaptureCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseDown` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseDownCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseEnter` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseLeave` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseMove` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseMoveCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseOut` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseOutCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseOver` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseOverCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseUp` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseUpCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerCancel` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerCancelCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerDown` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerDownCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerEnter` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerLeave` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerMove` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerMoveCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerOut` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerOutCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerOver` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerOverCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerUp` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerUpCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onScroll` | `React.UIEventHandler<HTMLDivElement> | undefined` | — |  |
| `onScrollCapture` | `React.UIEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchCancel` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchCancelCapture` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchEnd` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchEndCapture` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchMove` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchMoveCapture` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchStart` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchStartCapture` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionCancel` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionCancelCapture` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionEnd` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionEndCapture` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionRun` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionRunCapture` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionStart` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionStartCapture` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onWheel` | `React.WheelEventHandler<HTMLDivElement> | undefined` | — |  |
| `onWheelCapture` | `React.WheelEventHandler<HTMLDivElement> | undefined` | — |  |
| `render` | `DOMRenderFunction<"div", NavigationTreeRenderProps> | undefined` | — | Overrides the default DOM element with a custom render function. This allows rendering existing components with built-in styles and behaviors such as router links, animation libraries, and pre-styled components. Requirements: - You must render the expected element type (e.g. if `<button>` is expected, you cannot render an   `<a>`). - Only a single root DOM element can be rendered (no fragments). - You must pass through props and ref to the underlying DOM element, merging with your own prop   as appropriate. |
| `selectedRoute` | `string | null | undefined` | — | The route that is currently selected, matched against each item's `href`. |
| `slot` | `string | null | undefined` | — | A slot name for the component. Slots allow the component to receive props from a parent component. An explicit `null` value indicates that the local props completely override all props received from a parent. |
| `style` | `StyleOrFunction<NavigationTreeRenderProps> | undefined` | — | The inline [style](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style) for the element. A function may be provided to compute the style based on component state. |
| `translate` | `"no" | "yes" | undefined` | — |  |

### NavigationTreeItem

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string | undefined` | — | An accessibility label for this tree item. |
| `children` | `React.ReactNode` | — | The content of the side nav item along with any nested children. Supports static nested side nav items or use of a Collection to dynamically render nested side nav items. |
| `className` | `ClassNameOrFunction<NavigationTreeItemRenderProps> | undefined` | 'react-aria-NavigationTreeItem' | The CSS [className](https://developer.mozilla.org/en-US/docs/Web/API/Element/className) for the element. A function may be provided to compute the class based on component state. |
| `dir` | `string | undefined` | — |  |
| `download` | `boolean | string | undefined` | — | Causes the browser to download the linked URL. A string may be provided to suggest a file name. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#download). |
| `hasChildItems` | `boolean | undefined` | — | Whether this item has children, even if not loaded yet. |
| `hidden` | `boolean | undefined` | — |  |
| `href` | `string | undefined` | — | A URL to link to. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#href). |
| `hrefLang` | `string | undefined` | — | Hints at the human language of the linked URL. See[MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#hreflang). |
| `id` | `Key | undefined` | — | The unique id of the tree row. |
| `inert` | `boolean | undefined` | — |  |
| `isDisabled` | `boolean | undefined` | — | Whether the item is disabled. |
| `lang` | `string | undefined` | — |  |
| `onAnimationEnd` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAnimationEndCapture` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAnimationIteration` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAnimationIterationCapture` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAnimationStart` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAnimationStartCapture` | `React.AnimationEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAuxClick` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onAuxClickCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onClick` | `((e: React.MouseEvent<FocusableElement>) => void) | undefined` | — | **Not recommended – use `onPress` instead.** `onClick` is an alias for `onPress` provided for compatibility with other libraries. `onPress` provides additional event details for non-mouse interactions. |
| `onClickCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onContextMenu` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onContextMenuCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onDoubleClick` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onDoubleClickCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onGotPointerCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onGotPointerCaptureCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onHoverChange` | `((isHovering: boolean) => void) | undefined` | — | Handler that is called when the hover state changes. |
| `onHoverEnd` | `((e: HoverEvent) => void) | undefined` | — | Handler that is called when a hover interaction ends. |
| `onHoverStart` | `((e: HoverEvent) => void) | undefined` | — | Handler that is called when a hover interaction starts. |
| `onLostPointerCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onLostPointerCaptureCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseDown` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseDownCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseEnter` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseLeave` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseMove` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseMoveCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseOut` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseOutCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseOver` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseOverCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseUp` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onMouseUpCapture` | `React.MouseEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerCancel` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerCancelCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerDown` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerDownCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerEnter` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerLeave` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerMove` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerMoveCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerOut` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerOutCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerOver` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerOverCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerUp` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPointerUpCapture` | `React.PointerEventHandler<HTMLDivElement> | undefined` | — |  |
| `onPress` | `((e: PressEvent) => void) | undefined` | — | Handler that is called when the press is released over the target. |
| `onPressChange` | `((isPressed: boolean) => void) | undefined` | — | Handler that is called when the press state changes. |
| `onPressEnd` | `((e: PressEvent) => void) | undefined` | — | Handler that is called when a press interaction ends, either over the target or when the pointer leaves the target. |
| `onPressStart` | `((e: PressEvent) => void) | undefined` | — | Handler that is called when a press interaction starts. |
| `onPressUp` | `((e: PressEvent) => void) | undefined` | — | Handler that is called when a press is released over the target, regardless of whether it started on the target or not. |
| `onScroll` | `React.UIEventHandler<HTMLDivElement> | undefined` | — |  |
| `onScrollCapture` | `React.UIEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchCancel` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchCancelCapture` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchEnd` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchEndCapture` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchMove` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchMoveCapture` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchStart` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTouchStartCapture` | `React.TouchEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionCancel` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionCancelCapture` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionEnd` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionEndCapture` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionRun` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionRunCapture` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionStart` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onTransitionStartCapture` | `React.TransitionEventHandler<HTMLDivElement> | undefined` | — |  |
| `onWheel` | `React.WheelEventHandler<HTMLDivElement> | undefined` | — |  |
| `onWheelCapture` | `React.WheelEventHandler<HTMLDivElement> | undefined` | — |  |
| `ping` | `string | undefined` | — | A space-separated list of URLs to ping when the link is followed. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#ping). |
| `referrerPolicy` | `React.HTMLAttributeReferrerPolicy | undefined` | — | How much of the referrer to send when following the link. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#referrerpolicy). |
| `rel` | `string | undefined` | — | The relationship between the linked resource and the current page. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel). |
| `render` | `DOMRenderFunction<"div", NavigationTreeItemRenderProps> | undefined` | — | Overrides the default DOM element with a custom render function. This allows rendering existing components with built-in styles and behaviors such as router links, animation libraries, and pre-styled components. Requirements: - You must render the expected element type (e.g. if `<button>` is expected, you cannot render an   `<a>`). - Only a single root DOM element can be rendered (no fragments). - You must pass through props and ref to the underlying DOM element, merging with your own prop   as appropriate. |
| `routerOptions` | `undefined` | — | Options for the configured client side router. |
| `style` | `StyleOrFunction<NavigationTreeItemRenderProps> | undefined` | — | The inline [style](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style) for the element. A function may be provided to compute the style based on component state. |
| `target` | `React.HTMLAttributeAnchorTarget | undefined` | — | The target window for the link. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#target). |
| `textValue` | `string` | — | A string representation of the tree item's contents, used for features like typeahead. |
| `translate` | `"no" | "yes" | undefined` | — |  |

### NavigationTreeItemContent

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ChildrenOrFunction<NavigationTreeItemContentRenderProps>` | — | The children of the component. A function may be provided to alter the children based on component state. |

### NavigationTreeSection

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string | undefined` | — | An accessibility label for the section. |
| `children` | `((item: T) => React.ReactElement) | React.ReactNode` | — | Static child items or a function to render children. |
| `className` | `string | undefined` | — | The CSS [className](https://developer.mozilla.org/en-US/docs/Web/API/Element/className) for the element. |
| `dependencies` | `readonly any[] | undefined` | — | Values that should invalidate the item cache when using dynamic collections. |
| `dir` | `string | undefined` | — |  |
| `hidden` | `boolean | undefined` | — |  |
| `id` | `Key | undefined` | — | The unique id of the section. |
| `inert` | `boolean | undefined` | — |  |
| `items` | `Iterable<T> | undefined` | — | Item objects in the section. |
| `lang` | `string | undefined` | — |  |
| `onAnimationEnd` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAnimationEndCapture` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAnimationIteration` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAnimationIterationCapture` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAnimationStart` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAnimationStartCapture` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAuxClick` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onAuxClickCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onClick` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onClickCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onContextMenu` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onContextMenuCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onDoubleClick` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onDoubleClickCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onGotPointerCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onGotPointerCaptureCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onLostPointerCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onLostPointerCaptureCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseDown` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseDownCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseEnter` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseLeave` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseMove` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseMoveCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseOut` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseOutCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseOver` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseOverCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseUp` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseUpCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerCancel` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerCancelCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerDown` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerDownCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerEnter` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerLeave` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerMove` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerMoveCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerOut` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerOutCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerOver` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerOverCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerUp` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerUpCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onScroll` | `React.UIEventHandler<HTMLElement> | undefined` | — |  |
| `onScrollCapture` | `React.UIEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchCancel` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchCancelCapture` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchEnd` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchEndCapture` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchMove` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchMoveCapture` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchStart` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchStartCapture` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionCancel` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionCancelCapture` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionEnd` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionEndCapture` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionRun` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionRunCapture` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionStart` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionStartCapture` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onWheel` | `React.WheelEventHandler<HTMLElement> | undefined` | — |  |
| `onWheelCapture` | `React.WheelEventHandler<HTMLElement> | undefined` | — |  |
| `render` | `DOMRenderFunction<"div", undefined> | undefined` | — | Overrides the default DOM element with a custom render function. This allows rendering existing components with built-in styles and behaviors such as router links, animation libraries, and pre-styled components. Requirements: - You must render the expected element type (e.g. if `<button>` is expected, you cannot render an   `<a>`). - Only a single root DOM element can be rendered (no fragments). - You must pass through props and ref to the underlying DOM element, merging with your own prop   as appropriate. |
| `style` | `React.CSSProperties | undefined` | — | The inline [style](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style) for the element. |
| `translate` | `"no" | "yes" | undefined` | — |  |

### NavigationTreeHeader

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | — | The children of the component. |
| `className` | `string | undefined` | — | The CSS [className](https://developer.mozilla.org/en-US/docs/Web/API/Element/className) for the element. |
| `dir` | `string | undefined` | — |  |
| `hidden` | `boolean | undefined` | — |  |
| `id` | `string | undefined` | — | The element's unique identifier. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id). |
| `inert` | `boolean | undefined` | — |  |
| `lang` | `string | undefined` | — |  |
| `onAnimationEnd` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAnimationEndCapture` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAnimationIteration` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAnimationIterationCapture` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAnimationStart` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAnimationStartCapture` | `React.AnimationEventHandler<HTMLElement> | undefined` | — |  |
| `onAuxClick` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onAuxClickCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onClick` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onClickCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onContextMenu` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onContextMenuCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onDoubleClick` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onDoubleClickCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onGotPointerCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onGotPointerCaptureCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onLostPointerCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onLostPointerCaptureCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseDown` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseDownCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseEnter` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseLeave` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseMove` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseMoveCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseOut` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseOutCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseOver` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseOverCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseUp` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onMouseUpCapture` | `React.MouseEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerCancel` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerCancelCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerDown` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerDownCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerEnter` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerLeave` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerMove` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerMoveCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerOut` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerOutCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerOver` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerOverCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerUp` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onPointerUpCapture` | `React.PointerEventHandler<HTMLElement> | undefined` | — |  |
| `onScroll` | `React.UIEventHandler<HTMLElement> | undefined` | — |  |
| `onScrollCapture` | `React.UIEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchCancel` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchCancelCapture` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchEnd` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchEndCapture` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchMove` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchMoveCapture` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchStart` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTouchStartCapture` | `React.TouchEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionCancel` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionCancelCapture` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionEnd` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionEndCapture` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionRun` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionRunCapture` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionStart` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onTransitionStartCapture` | `React.TransitionEventHandler<HTMLElement> | undefined` | — |  |
| `onWheel` | `React.WheelEventHandler<HTMLElement> | undefined` | — |  |
| `onWheelCapture` | `React.WheelEventHandler<HTMLElement> | undefined` | — |  |
| `render` | `DOMRenderFunction<"div", undefined> | undefined` | — | Overrides the default DOM element with a custom render function. This allows rendering existing components with built-in styles and behaviors such as router links, animation libraries, and pre-styled components. Requirements: - You must render the expected element type (e.g. if `<button>` is expected, you cannot render an   `<a>`). - Only a single root DOM element can be rendered (no fragments). - You must pass through props and ref to the underlying DOM element, merging with your own prop   as appropriate. |
| `style` | `React.CSSProperties | undefined` | — | The inline [style](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style) for the element. |
| `translate` | `"no" | "yes" | undefined` | — |  |
