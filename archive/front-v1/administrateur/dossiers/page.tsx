import { StartDsfrOnHydration } from "../../../dsfr-bootstrap";
import { Dossiers } from "./Dossiers";

export default function DossiersPage() {
  return (
    <>
      <StartDsfrOnHydration />
      <Dossiers />
    </>
  );
}
