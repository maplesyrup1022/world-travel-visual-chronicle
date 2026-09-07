// server component must be function component
import React from "react";

const NavBar = async () => {
  const res = await fetch("http://127.0.0.1:8000/user/current");
  const user = await res.json();
  return <h3>{user.username}'s world travel visual chronicle </h3>;
};

export default NavBar;
