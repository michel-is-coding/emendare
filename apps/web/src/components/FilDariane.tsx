import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";

export function FilDariane({
  segments = [],
  courant,
}: {
  segments?: { label: string; href: string }[];
  courant: string;
}) {
  return (
    <Breadcrumb
      homeLinkProps={{ href: "/" }}
      segments={segments.map((s) => ({
        label: s.label,
        linkProps: { href: s.href },
      }))}
      currentPageLabel={courant}
    />
  );
}
