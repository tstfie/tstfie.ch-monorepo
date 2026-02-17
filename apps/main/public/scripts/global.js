document.addEventListener("DOMContentLoaded", () => {
  const navs = document.querySelectorAll(".projects-nav");

  navs.forEach((nav) => {
    const trigger = nav.querySelector(".view-projects");
    if (!trigger) return;

    /*// Define click behaviour //*/
    trigger.addEventListener("click", (e) => {
      const isHome =
        window.location.pathname === "/" ||
        window.location.pathname === "/index.html";

      if (isHome) {
        e.preventDefault();
        e.stopPropagation();
        nav.classList.add("is-open");
      }
      /*// not home > allow navigation //*/
    });

    /*// Click outside to close //*/
    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(e.target)) return;

      nav.classList.remove("is-open");
    
    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(e.target)) return;

      e.stopPropagation(); // IMPORTANT on touch
      nav.classList.remove("is-open");
    });

      /*// Remove ?projects=open if it exists //*/
      const params = new URLSearchParams(window.location.search);
      if (params.get("projects") === "open") {
        params.delete("projects");
        const newUrl =
          window.location.pathname +
          (params.toString() ? "?" + params.toString() : "");
        window.history.replaceState({}, "", newUrl);
      }
    });

    /*// Auto-open from URL intent //*/
    const params = new URLSearchParams(window.location.search);
    if (params.get("projects") === "open") {
      nav.classList.add("is-open");

      /*// Remove ?projects=open from URL immediately //*/
      params.delete("projects");
      const newUrl =
        window.location.pathname +
        (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, "", newUrl);
    }
  });
});
