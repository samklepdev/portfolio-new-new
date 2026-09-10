import styles from "./TechStack.module.css";

type Group = {
  label: string;
  items: readonly string[];
};

const GROUPS: readonly Group[] = [
  { label: "Languages", items: ["TypeScript", "JavaScript", "C#", "HTML", "CSS"] },
  { label: "Frontend", items: ["React", "Next.js", "Redux"] },
  { label: "Backend", items: ["Node.js", "Express", ".NET"] },
  { label: "Data", items: ["PostgreSQL", "MongoDB"] },
  { label: "Tooling", items: ["Git", "Heroku"] },
];

export function TechStack() {
  return (
    <dl className={styles.groups}>
      {GROUPS.map((group) => (
        <div key={group.label} className={styles.group}>
          <dt className={styles.label}>{group.label}</dt>
          <dd>
            <ul className={styles.chips} role="list">
              {group.items.map((item) => (
                <li key={item} className={styles.chip}>
                  {item}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}
