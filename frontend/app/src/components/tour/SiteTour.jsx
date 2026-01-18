import { useSiteTour } from '../../hooks/useSiteTour';
import './SiteTour.css';

/**
 * SiteTour Component - Glassmorphism guided tour for new users
 * @param {Array} steps - Array of tour steps: [{ selector, title, content }]
 * @param {string} tourKey - Unique identifier for this tour
 * @param {Function} onComplete - Callback when tour is completed
 * @param {Function} onSkip - Callback when tour is skipped
 */
const SiteTour = ({ steps, tourKey, onComplete, onSkip }) => {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    targetRect,
    tooltipPosition,
    isFirstStep,
    isLastStep,
    progress,
    next,
    prev,
    skip,
    finish,
  } = useSiteTour(steps, tourKey, { onComplete, onSkip });

  if (!isActive || !currentStep) return null;

  // Calculate arrow position based on tooltip placement
  const getArrowStyle = () => {
    const { placement } = tooltipPosition;
    const baseStyle = {
      position: 'absolute',
      width: 0,
      height: 0,
    };

    switch (placement) {
      case 'top':
        return {
          ...baseStyle,
          bottom: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '10px solid rgba(255, 255, 255, 0.15)',
        };
      case 'bottom':
        return {
          ...baseStyle,
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderBottom: '10px solid rgba(255, 255, 255, 0.15)',
        };
      case 'left':
        return {
          ...baseStyle,
          right: '-10px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '10px solid transparent',
          borderBottom: '10px solid transparent',
          borderLeft: '10px solid rgba(255, 255, 255, 0.15)',
        };
      case 'right':
        return {
          ...baseStyle,
          left: '-10px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '10px solid transparent',
          borderBottom: '10px solid transparent',
          borderRight: '10px solid rgba(255, 255, 255, 0.15)',
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div className="site-tour" dir="rtl">
      {/* Overlay with spotlight cutout */}
      <svg className="tour-overlay" width="100%" height="100%">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="8"
                ry="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight highlight border */}
      {targetRect && (
        <div
          className="tour-spotlight"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="tour-tooltip"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Close button */}
        <button className="tour-close-btn" onClick={skip} aria-label="Close tour">
          ✕
        </button>

        {/* Arrow */}
        <div style={getArrowStyle()} />

        {/* Content */}
        <div className="tour-content">
          {/* Step indicator */}
          <div className="tour-step-indicator">
            {currentStepIndex + 1} / {totalSteps}
          </div>

          {/* Title */}
          <h3 className="tour-title">{currentStep.title}</h3>

          {/* Description */}
          <p className="tour-description">{currentStep.content}</p>

          {/* Progress dots */}
          <div className="tour-progress">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`tour-progress-dot ${index === currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'completed' : ''}`}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="tour-progress-bar">
            <div
              className="tour-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="tour-controls">
          <button
            className="tour-btn tour-btn-skip"
            onClick={skip}
          >
            تخطي
          </button>

          <div className="tour-nav-buttons">
            {!isFirstStep && (
              <button
                className="tour-btn tour-btn-secondary"
                onClick={prev}
              >
                السابق
              </button>
            )}

            {isLastStep ? (
              <button
                className="tour-btn tour-btn-primary"
                onClick={finish}
              >
                إنهاء
              </button>
            ) : (
              <button
                className="tour-btn tour-btn-primary"
                onClick={next}
              >
                التالي
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteTour;
