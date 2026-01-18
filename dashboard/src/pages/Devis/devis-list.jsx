import React from "react";
import TasksDetails from "@/components/tasks/TasksDetails";
import DevisTable from "@/components/devisList/DevisTable";

const DevisList = () => {
  return (
    <>
      <div className="main-content">
        <div className="row">
          <DevisTable />
        </div>
      </div>
      <TasksDetails />
    </>
  );
};

export default DevisList;
