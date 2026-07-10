import { StartDsfrOnHydration } from "../../dsfr-bootstrap";
import { Cockpit } from "./Cockpit";

export default function AdministrateurPage() {
  return (
    <>
      <StartDsfrOnHydration />
      <Cockpit />
    </>
  );
}
