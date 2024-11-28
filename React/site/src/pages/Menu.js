import React from "react";
import { push as BurgerMenu } from "react-burger-menu";
import { Link, useParams } from "react-router-dom";
import "./menu.css"; // Create a CSS file for custom styles

const Menu = ({ open, setOpen }) => {
  const { id } = useParams(); // Get the patient ID dynamically

  return (
    <BurgerMenu
      isOpen={open}
      onStateChange={({ isOpen }) => setOpen(isOpen)}
      pageWrapId={"page-wrap"}
      outerContainerId={"outer-container"}
    >
      {/* Use Link to navigate dynamically */}
      <Link id="pacientes" className="menu-item" to={`/pacientes`}>
        Pacientes
      </Link>
      <Link id="historico" className="menu-item" to={`/pacientes/${id}/historico`}>
        Histórico
      </Link>
      <Link id="relatorio" className="menu-item" to={`/pacientes/${id}/relatorio`}>
        Relatório
      </Link>
    </BurgerMenu>
  );
};

export default Menu;
