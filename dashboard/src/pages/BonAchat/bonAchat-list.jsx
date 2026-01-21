import React from "react";
import TasksDetails from "@/components/tasks/TasksDetails";
import BonAchatTable from "@/components/bonAchat/BonAchat";

const BonAchatList = () => {
  return (
    <>
      <div className="main-content">
        <div className="row">
          <BonAchatTable />
        </div>
      </div>
      <TasksDetails />
    </>
  );
};

export default BonAchatList;
