"use client";

import { memo } from "react";

// Renders passage HTML — strips vocab markup, then post-processes to make
// leading paragraph letters (A. B. C. ...) bold + larger as in the original UI.
// memo: prevents re-render so manually-inserted highlight <mark> elements persist.
const PassageRenderer = memo(function PassageRenderer({ html }: { html: string }) {
  // Strip {[ ... ][N]} vocab markup, keep only the text
  let cleaned = html.replace(/\{\[([^\]]*)\]\[(\d+)\]\}/g, "$1");

  // Bold-ify leading paragraph letters: <p>A. text</p> -> <p><span class="paragraph-letter">A.</span> text</p>
  // Match: start of <p>, optional space, single letter A-Z, period, then space.
  cleaned = cleaned.replace(
    /<p>(\s*)([A-Z])\.(\s+)/g,
    '<p>$1<span class="paragraph-letter">$2.</span>$3'
  );

  return (
    <div
      className="passage-html"
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
});

export default PassageRenderer;
