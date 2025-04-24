document.addEventListener('DOMContentLoaded', () => {
    const track = document.querySelector('.carousel-track');
    const slides = Array.from(track.children);
    const nextButton = document.querySelector('.carousel-button.next');
    const prevButton = document.querySelector('.carousel-button.prev');
    const dotsContainer = document.querySelector('.carousel-dots');

    // Set up initial slide positions
    const slideWidth = slides[0].getBoundingClientRect().width;
    slides.forEach((slide, index) => {
        slide.style.left = slideWidth * index + 'px';
    });

    // Create dot indicators
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('carousel-dot');
        if (index === 0) dot.classList.add('active');
        dotsContainer.appendChild(dot);
    });

    const dots = Array.from(dotsContainer.children);

    let currentSlide = 0;
    const totalSlides = slides.length;

    // Function to move to a specific slide
    const moveToSlide = (targetIndex) => {
        if (targetIndex < 0) targetIndex = totalSlides - 1;
        if (targetIndex >= totalSlides) targetIndex = 0;

        track.style.transform = `translateX(-${targetIndex * slideWidth}px)`;

        // Update active dot
        dots.forEach(dot => dot.classList.remove('active'));
        dots[targetIndex].classList.add('active');

        currentSlide = targetIndex;
    };

    // Event listeners for next and previous buttons
    nextButton.addEventListener('click', () => moveToSlide(currentSlide + 1));
    prevButton.addEventListener('click', () => moveToSlide(currentSlide - 1));

    // Event listeners for dot indicators
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => moveToSlide(index));
    });

    // Auto-advance carousel every 5 seconds
    setInterval(() => {
        moveToSlide(currentSlide + 1);
    }, 5000);
}); 