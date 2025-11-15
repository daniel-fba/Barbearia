import { useState, useEffect } from "react";
import "../styles/Carousel.css";

export function Carousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = [
    { src: "/images/corte1.jpeg", alt: "" },
    { src: "/images/corte2.jpeg", alt: "" },
    { src: "/images/corte3.jpeg", alt: "" },
    { src: "/images/corte4.jpeg", alt: "" },
  ];

  // Auto-play a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="carousel">
      <div className="carousel-container">
        <button className="carousel-button prev" onClick={goToPrevious}>
          &#8249;
        </button>

        <div className="carousel-content">
          <img
            src={images[currentIndex].src}
            alt={images[currentIndex].alt}
            className="carousel-image"
          />
          <p className="carousel-caption">{images[currentIndex].alt}</p>
        </div>

        <button className="carousel-button next" onClick={goToNext}>
          &#8250;
        </button>
      </div>

      <div className="carousel-dots">
        {images.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentIndex ? "active" : ""}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}
