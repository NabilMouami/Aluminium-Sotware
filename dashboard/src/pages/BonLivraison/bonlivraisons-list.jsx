import React from "react";
import TasksDetails from "@/components/tasks/TasksDetails";
import BonLivraisonTable from "@/components/bonLivraisonsList/BonLivraison";

const BonLivraisonsList = () => {
  return (
    <>
      <div className="main-content">
        <div className="row">
          <BonLivraisonTable />
        </div>
      </div>
      <TasksDetails />
    </>
  );
};

export default BonLivraisonsList;
