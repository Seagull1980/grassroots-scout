// Hooks violation detector
let hookCallCount = 0;
let currentComponent = '';

export const resetHookTracker = (componentName: string) => {
  hookCallCount = 0;
  currentComponent = componentName;
  console.log(`🔄 Starting render of ${componentName}`);
};

export const trackHook = (hookName: string) => {
  hookCallCount++;
  console.log(`🪝 Hook #${hookCallCount}: ${hookName} in ${currentComponent}`);
};

export const validateHookCount = (expectedCount: number) => {
  if (hookCallCount !== expectedCount) {
    console.error(`❌ HOOKS VIOLATION in ${currentComponent}! Expected ${expectedCount} hooks, got ${hookCallCount}`);
    console.error('This indicates a conditional hook call or early return between hooks!');
  } else {
    console.log(`✅ ${currentComponent} hooks OK: ${hookCallCount}/${expectedCount}`);
  }
};
