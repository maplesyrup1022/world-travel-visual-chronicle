import React from "react";

const NavBar = async () => {
  const res = await fetch("http://127.0.0.1:8000/user/current");
  const user = await res.json();
  return (
    <nav className="pointer-events-none absolute left-0 top-0 z-50 w-full px-5 py-4 sm:px-8">
      <div className="flex items-center justify-between border-b border-white/35 pb-3 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
        <h1 className="font-ribbon text-2xl font-bold tracking-tight sm:text-3xl">
          {user.username}&apos;s world travel chronicle
        </h1>
      </div>
    </nav>
  );
};

export default NavBar;
