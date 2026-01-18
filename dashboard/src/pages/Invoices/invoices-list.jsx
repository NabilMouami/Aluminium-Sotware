import React from "react";
import TasksDetails from "@/components/tasks/TasksDetails";
import InvoiceTable from "@/components/invoicesList/InvoiceTable";

const InvoicesList = () => {
  return (
    <>
      <div className="main-content">
        <div className="row">
          <InvoiceTable />
        </div>
      </div>
      <TasksDetails />
    </>
  );
};

export default InvoicesList;
