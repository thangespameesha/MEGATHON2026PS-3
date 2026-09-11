import { useState } from "react";
import EmployeePortal from "./EmployeePortal";
import SecurityLeadPortal from "./SecurityLeadPortal";
import MainHeadPortal from "./MainHeadPortal";
import LoginPage from "./LoginPage";

type Role = "select" | "mainhead" | "employee" | "security";

export default function App() {
  // Start on the login page as requested by user
  const [role, setRole] = useState<Role>("select");

  if (role === "mainhead") {
    return (
      <MainHeadPortal
        onSwitch={() => setRole("select")}
        onRoleSelect={(r) => setRole(r)}
      />
    );
  }
  if (role === "employee") {
    return <EmployeePortal onSwitch={() => setRole("select")} />;
  }
  if (role === "security") {
    return <SecurityLeadPortal onSwitch={() => setRole("select")} />;
  }

  return <LoginPage onLogin={setRole} />;
}
