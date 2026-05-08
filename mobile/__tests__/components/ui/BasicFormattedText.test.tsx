import { BasicFormattedText } from "@/components/ui/BasicFormattedText";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Linking } from "react-native";

const openUrlSpy = jest
  .spyOn(Linking, "openURL")
  .mockImplementation(() => Promise.resolve({} as never));

describe("BasicFormattedText", () => {
  beforeEach(() => {
    openUrlSpy.mockClear();
  });

  it("formats bold, italic, strikethrough, and links", () => {
    const { getByText, queryByText } = render(
      <BasicFormattedText>
        {"**bold** *italic* ~~strike~~ --dash strike-- https://example.com"}
      </BasicFormattedText>,
    );

    expect(getByText("bold").props.style).toMatchObject({
      fontWeight: "700",
    });
    expect(getByText("italic").props.style).toMatchObject({
      fontStyle: "italic",
    });
    expect(getByText("strike").props.style).toMatchObject({
      textDecorationLine: "line-through",
    });
    expect(getByText("dash strike").props.style).toMatchObject({
      textDecorationLine: "line-through",
    });

    fireEvent.press(getByText("https://example.com"));

    expect(queryByText("--dash strike--")).toBeNull();
    expect(openUrlSpy).toHaveBeenCalledWith("https://example.com");
  });

  it("formats mobile keyboard dash variants as strikethrough", () => {
    const { getByText, queryByText } = render(
      <BasicFormattedText>{"—em strike— –en strike–"}</BasicFormattedText>,
    );

    expect(getByText("em strike").props.style).toMatchObject({
      textDecorationLine: "line-through",
    });
    expect(getByText("en strike").props.style).toMatchObject({
      textDecorationLine: "line-through",
    });
    expect(queryByText("—em strike—")).toBeNull();
    expect(queryByText("–en strike–")).toBeNull();
  });

  it("formats quote lines that start with greater-than", () => {
    const { getByText, queryByText } = render(
      <BasicFormattedText>{"> quoted **bold** text"}</BasicFormattedText>,
    );

    expect(getByText("quoted bold text").props.style).toMatchObject({
      fontStyle: "italic",
    });
    expect(getByText("bold").props.style).toMatchObject({
      fontWeight: "700",
    });
    expect(queryByText("> quoted **bold** text")).toBeNull();
  });
});
