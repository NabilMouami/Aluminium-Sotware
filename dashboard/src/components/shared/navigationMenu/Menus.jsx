import React, { Fragment, useEffect, useState } from "react";
import { FiChevronRight } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { menuList } from "@/utils/fackData/menuList";
import getIcon from "@/utils/getIcon";

const allowedPaths = ["/bon-livraison/create", "/bon-livraisons/list"];

const Menus = () => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openSubDropdown, setOpenSubDropdown] = useState(null);
  const [activeParent, setActiveParent] = useState("");
  const [activeChild, setActiveChild] = useState("");
  const pathName = useLocation().pathname;

  const { User } = useSelector((state) => state.userInfo);

  // ✅ FILTER MENU HERE
  const filteredMenuList =
    User?.role === "admin"
      ? menuList
      : menuList
          .map((menu) => ({
            ...menu,
            dropdownMenu: menu.dropdownMenu.filter((item) =>
              allowedPaths.includes(item.path),
            ),
          }))
          .filter((menu) => menu.dropdownMenu.length > 0);

  const handleMainMenu = (e, name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  useEffect(() => {
    if (pathName !== "/") {
      const x = pathName.split("/");
      setActiveParent(x[1]);
      setActiveChild(x[2]);
      setOpenDropdown(x[1]);
      setOpenSubDropdown(x[2]);
    }
  }, [pathName]);

  return (
    <>
      {filteredMenuList.map(({ dropdownMenu, id, name, path, icon }) => (
        <li
          key={id}
          onClick={(e) => handleMainMenu(e, name)}
          className={`nxl-item nxl-hasmenu ${
            activeParent === name ? "active nxl-trigger" : ""
          }`}
        >
          <Link to={path} className="nxl-link text-capitalize">
            <span className="nxl-micon">{getIcon(icon)}</span>
            <span className="nxl-mtext" style={{ paddingLeft: "2.5px" }}>
              {name}
            </span>
            <span className="nxl-arrow fs-16">
              <FiChevronRight />
            </span>
          </Link>

          <ul
            className={`nxl-submenu ${
              openDropdown === name ? "nxl-menu-visible" : "nxl-menu-hidden"
            }`}
          >
            {dropdownMenu.map(({ id, name, path, subdropdownMenu }) => (
              <Fragment key={id}>
                {!subdropdownMenu?.length ? (
                  <li
                    className={`nxl-item ${pathName === path ? "active" : ""}`}
                  >
                    <Link className="nxl-link" to={path}>
                      {name}
                    </Link>
                  </li>
                ) : null}
              </Fragment>
            ))}
          </ul>
        </li>
      ))}
    </>
  );
};

export default Menus;
