import React from "react";
import TasksDetails from "@/components/tasks/TasksDetails";
import BonAvoirTable from "@/components/bonAvoir/BonAvoir";

const BonAvoirList = () => {
  return (
    <>
      <div className="main-content">
        <div className="row">
          <BonAvoirTable />
        </div>
      </div>
      <TasksDetails />
    </>
  );
};

export default BonAvoirList;
