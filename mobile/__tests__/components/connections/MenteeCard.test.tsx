import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

import { MenteeCard } from "@/components/connections/MenteeCard";

const baseProps = {
  id: "mentee-1",
  name: "John Smith",
  subtitle: "Aspiring developer",
};

describe("MenteeCard — rendering", () => {
  it("renders view profile, message and more buttons", () => {
    const { getByTestId } = render(<MenteeCard {...baseProps} />);
    expect(getByTestId("mentee-view-profile-button")).toBeTruthy();
    expect(getByTestId("mentee-message-button")).toBeTruthy();
    expect(getByTestId("mentee-more-button")).toBeTruthy();
  });

  it("renders no tags row when tags is empty", () => {
    const { queryAllByTestId } = render(<MenteeCard {...baseProps} tags={[]} />);
    expect(queryAllByTestId("mentee-tag")).toHaveLength(0);
  });
});

describe("MenteeCard — interactions", () => {
  it("calls onPress when view profile button is pressed", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<MenteeCard {...baseProps} onPress={onPress} />);
    fireEvent.press(getByTestId("mentee-view-profile-button"));
    expect(onPress).toHaveBeenCalled();
  });

  it("calls onMessage when message button is pressed", () => {
    const onMessage = jest.fn();
    const { getByTestId } = render(<MenteeCard {...baseProps} onMessage={onMessage} />);
    fireEvent.press(getByTestId("mentee-message-button"));
    expect(onMessage).toHaveBeenCalled();
  });

  it("calls onMore when more button is pressed", () => {
    const onMore = jest.fn();
    const { getByTestId } = render(<MenteeCard {...baseProps} onMore={onMore} />);
    fireEvent.press(getByTestId("mentee-more-button"));
    expect(onMore).toHaveBeenCalled();
  });
});