document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // TAHUN FOOTER
    // ==========================================

    const year = document.getElementById("year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }


    // ==========================================
    // MENU MOBILE
    // ==========================================

    const menuToggle = document.getElementById("menuToggle");
    const mainNav = document.getElementById("mainNav");

    if (menuToggle && mainNav) {

        menuToggle.addEventListener("click", () => {
            mainNav.classList.toggle("open");
        });

        document.querySelectorAll("#mainNav a").forEach(link => {
            link.addEventListener("click", () => {
                mainNav.classList.remove("open");
            });
        });
    }


    // ==========================================
    // DATA MATERI
    // ==========================================

    const searchInput = document.getElementById("searchInput");
    const clearSearch = document.getElementById("clearSearch");
    const searchResult = document.getElementById("searchResult");

    const filterButtons = document.querySelectorAll(".filter-btn");
    const courseCards = document.querySelectorAll(".course-card");

    let activeFilter = "semua";


    // ==========================================
    // FUNGSI FILTER + SEARCH
    // ==========================================

    function filterMaterials() {

        const keyword = searchInput
            ? searchInput.value.toLowerCase().trim()
            : "";

        let visibleCount = 0;


        courseCards.forEach(card => {

            const category =
                (card.dataset.category || "").toLowerCase();

            const cardText =
                card.textContent.toLowerCase();


            // Cek kategori
            const categoryMatch =
                activeFilter === "semua" ||
                category === activeFilter;


            // Cek kata pencarian
            const searchMatch =
                keyword === "" ||
                cardText.includes(keyword);


            // Tampilkan / sembunyikan
            if (categoryMatch && searchMatch) {

                card.style.display = "";

                card.classList.remove("search-hidden");

                visibleCount++;

            } else {

                card.style.display = "none";

                card.classList.add("search-hidden");
            }

        });


        // ==========================================
        // HASIL PENCARIAN
        // ==========================================

        if (searchResult) {

            if (keyword !== "") {

                if (visibleCount > 0) {

                    searchResult.textContent =
                        `Menampilkan ${visibleCount} materi untuk "${searchInput.value}"`;

                } else {

                    searchResult.textContent =
                        `Materi "${searchInput.value}" tidak ditemukan.`;
                }

            } else {

                searchResult.textContent = "";
            }
        }


        // ==========================================
        // TOMBOL X
        // ==========================================

        if (clearSearch) {

            if (keyword !== "") {

                clearSearch.classList.add("show");

            } else {

                clearSearch.classList.remove("show");
            }
        }
    }


    // ==========================================
    // KLIK FILTER
    // ==========================================

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            filterButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            activeFilter =
                button.dataset.filter || "semua";

            filterMaterials();
        });

    });


    // ==========================================
    // PENCARIAN REAL-TIME
    // ==========================================

    if (searchInput) {

        searchInput.addEventListener("input", () => {

            filterMaterials();

        });
    }


    // ==========================================
    // TOMBOL CLEAR
    // ==========================================

    if (clearSearch) {

        clearSearch.addEventListener("click", () => {

            if (searchInput) {

                searchInput.value = "";

                searchInput.focus();
            }

            filterMaterials();
        });
    }


    // ==========================================
    // TAMPILKAN SEMUA MATERI SAAT AWAL
    // ==========================================

    filterMaterials();

});