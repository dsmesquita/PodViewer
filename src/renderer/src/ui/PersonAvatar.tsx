import {
  Avatar,
  AvatarGroup,
  AvatarGroupItem,
  AvatarGroupPopover,
  partitionAvatarGroupItems,
} from "@fluentui/react-components";
import type { Person } from "@shared/model";

export function PersonAvatar({
  person,
  size = 28,
}: {
  person: Person;
  size?: 24 | 28 | 32;
}) {
  return <Avatar name={person.name} size={size} color="colorful" aria-hidden />;
}

/** Stacked avatars; extra people move into an overflow popover that lists their names. */
export function PeopleAvatars({ people }: { people: Person[] }) {
  const { inlineItems, overflowItems } = partitionAvatarGroupItems({
    items: people,
    maxInlineItems: 5,
  });
  if (!people.length) return null;
  return (
    <AvatarGroup
      layout="stack"
      size={28}
      aria-label={people.map((p) => p.name).join(", ")}
    >
      {inlineItems.map((person) => (
        <AvatarGroupItem
          key={person.id}
          name={person.name}
          title={person.name}
          color="colorful"
        />
      ))}
      {overflowItems && (
        <AvatarGroupPopover>
          {overflowItems.map((person) => (
            <AvatarGroupItem key={person.id} name={person.name} />
          ))}
        </AvatarGroupPopover>
      )}
    </AvatarGroup>
  );
}
