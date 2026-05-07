import React from "react";
import { Linking, Text, type TextProps, type TextStyle } from "react-native";

type FormattedToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "strike"; value: string }
  | { type: "link"; value: string; href: string };

const TOKEN_REGEX =
  /(\*\*[\s\S]+?\*\*|__[\s\S]+?__|\*[^*\n]+?\*|_[^_\n]+?_|~~[\s\S]+?~~|--[\s\S]+?--|—[\s\S]+?—|–[\s\S]+?–|https?:\/\/[^\s]+|www\.[^\s]+)/g;

function trimTrailingLinkPunctuation(value: string): {
  hrefText: string;
  trailingText: string;
} {
  const match = value.match(/^(.+?)([.,!?;:)]+)?$/);
  return {
    hrefText: match?.[1] ?? value,
    trailingText: match?.[2] ?? "",
  };
}

function parseFormattedText(value: string): FormattedToken[] {
  const tokens: FormattedToken[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(TOKEN_REGEX)) {
    const raw = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      tokens.push({ type: "text", value: value.slice(lastIndex, index) });
    }

    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("www.")
    ) {
      const { hrefText, trailingText } = trimTrailingLinkPunctuation(raw);
      tokens.push({
        type: "link",
        value: hrefText,
        href: hrefText.startsWith("www.") ? `https://${hrefText}` : hrefText,
      });
      if (trailingText) {
        tokens.push({ type: "text", value: trailingText });
      }
    } else if (raw.startsWith("**") || raw.startsWith("__")) {
      tokens.push({ type: "bold", value: raw.slice(2, -2) });
    } else if (raw.startsWith("*") || raw.startsWith("_")) {
      tokens.push({ type: "italic", value: raw.slice(1, -1) });
    } else if (
      raw.startsWith("~~") ||
      raw.startsWith("--") ||
      raw.startsWith("—") ||
      raw.startsWith("–")
    ) {
      const markerLength =
        raw.startsWith("~~") || raw.startsWith("--") ? 2 : 1;
      tokens.push({
        type: "strike",
        value: raw.slice(markerLength, -markerLength),
      });
    } else {
      tokens.push({ type: "text", value: raw });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < value.length) {
    tokens.push({ type: "text", value: value.slice(lastIndex) });
  }

  return tokens;
}

interface BasicFormattedTextProps extends Omit<TextProps, "children"> {
  children: string;
  linkColor?: string;
}

export function BasicFormattedText({
  children,
  linkColor = "#2563eb",
  ...textProps
}: Readonly<BasicFormattedTextProps>) {
  const lines = children.split("\n");

  return (
    <Text {...textProps}>
      {lines.map((line, lineIndex) => {
        const quoteMatch = line.match(/^>\s?(.*)$/);
        const lineContent = quoteMatch?.[1] ?? line;
        const formattedLine = renderFormattedTokens(
          parseFormattedText(lineContent),
          linkColor,
          lineIndex,
        );
        const content = quoteMatch ? (
          <Text key={`quote-${lineIndex}`} style={{ fontStyle: "italic" }}>
            {formattedLine}
          </Text>
        ) : (
          formattedLine
        );

        return (
          <React.Fragment key={`line-${lineIndex}`}>
            {lineIndex > 0 ? "\n" : null}
            {content}
          </React.Fragment>
        );
      })}
    </Text>
  );
}

function renderFormattedTokens(
  tokens: FormattedToken[],
  linkColor: string,
  lineIndex: number,
) {
  return tokens.map((token, tokenIndex) => {
    const key = `${lineIndex}-${token.type}-${tokenIndex}`;
    if (token.type === "text") {
      return token.value;
    }

    const style: TextStyle =
      token.type === "bold"
        ? { fontWeight: "700" }
        : token.type === "italic"
          ? { fontStyle: "italic" }
          : token.type === "strike"
            ? { textDecorationLine: "line-through" }
            : {
                color: linkColor,
                textDecorationLine: "underline",
                fontWeight: "600",
              };

    return (
      <Text
        key={key}
        style={style}
        onPress={
          token.type === "link"
            ? () => {
                void Linking.openURL(token.href);
              }
            : undefined
        }
        accessibilityRole={token.type === "link" ? "link" : undefined}
      >
        {token.value}
      </Text>
    );
  });
}
