# STM32F401VETx LCD Stopwatch

![MCU](https://img.shields.io/badge/MCU-STM32F401VETx-blue)
![Language](https://img.shields.io/badge/Language-C-informational)
![IDE](https://img.shields.io/badge/IDE-STM32CubeIDE-orange)
![Simulation](https://img.shields.io/badge/Simulation-Proteus-green)
![Style](https://img.shields.io/badge/Code-Register_Level-lightgrey)

## Overview

This project implements a stopwatch on an STM32F401VETx microcontroller. The stopwatch time is shown on a 16x2 character LCD. A Start/Pause button controls the stopwatch, a second button changes the LED blink speed, and a buzzer gives a short beep on even-numbered stopwatch seconds.

The final firmware is written with direct register access instead of HAL function calls. STM32CubeMX/STM32CubeIDE were used for project setup and build support.

## Features

- Stopwatch with millisecond counter
- TIM2 interrupt every 1 ms for stopwatch timing
- Start/Pause button using EXTI4 on PE4
- Speed button on PE5
- LED blink output on PC13
- Buzzer output on PB6
- 16x2 LCD in 4-bit mode
- LCD refresh every 50 ms
- Register-level GPIO, timer, SysTick, EXTI, RCC, and NVIC setup
- Proteus simulation project included

## Hardware

| Part | Description |
|---|---|
| Microcontroller | STM32F401VETx |
| Display | 16x2 character LCD, LM016L or compatible |
| Buttons | 2 push buttons |
| LED | 1 LED with current-limiting resistor |
| Buzzer | Active buzzer or speaker model for simulation |
| Potentiometer | 10k for LCD contrast |
| Simulation | Proteus 8 Professional |

## Pin Connections

| Function | STM32 pin | Notes |
|---|---:|---|
| LCD RS | PB0 | Register select |
| LCD E | PB1 | Enable |
| LCD D4 | PB2 | LCD data bit 4 |
| LCD D5 | PB10 | LCD data bit 5 |
| LCD D6 | PB13 | LCD data bit 6 |
| LCD D7 | PB12 | LCD data bit 7 |
| LCD RW | GND | Write-only mode |
| LCD VSS | GND | Ground |
| LCD VDD | +5V | LCD supply in Proteus |
| LCD VEE | Potentiometer wiper | Contrast |
| Start/Pause button | PE4 | Input with pull-up, EXTI4 falling edge |
| Speed button | PE5 | Input with pull-up |
| LED | PC13 | Digital output |
| Buzzer | PB6 | Digital output |

## Architecture

```text
Reset
  -> Clock_Init()       : enable HSI, use 16 MHz system clock
  -> SysTick_Init()     : create helper 1 ms counter
  -> GPIO_Init()        : configure LCD, buttons, LED, buzzer
  -> TIM2_Init()        : configure 1 ms stopwatch interrupt
  -> EXTI4_Init()       : configure Start/Pause button interrupt
  -> LCD_Init()         : initialize LCD in 4-bit mode
  -> main loop
       - poll speed button
       - update LED
       - process buzzer rule
       - refresh LCD every 50 ms

Interrupts:
  SysTick_Handler       : increments sys_ms
  TIM2_IRQHandler       : increments stopwatch_ms when running
  EXTI4_IRQHandler      : toggles Start/Pause with debounce
```

## How It Works

TIM2 is configured to generate an interrupt every 1 ms. When the stopwatch is running, the TIM2 interrupt increments `stopwatch_ms`. The LCD displays the value as:

```text
MM:SS.mmm RUN
```

or:

```text
MM:SS.mmm PAU
```

The PE4 button toggles between running and paused. The PE5 button changes the LED blink period in this sequence:

```text
3000 ms -> 1500 ms -> 750 ms -> 375 ms -> 3000 ms
```

The buzzer turns on for 100 ms when the stopwatch reaches a new even-numbered second while running.

## Project Structure

```text
StopWatch/
  Core/
    Inc/                  Header files
    Src/
      main.c              Main register-level application
      gpio.c              CubeMX-generated GPIO file
      tim.c               CubeMX-generated TIM2 file
      stm32f4xx_it.c      CubeMX interrupt file, selected handlers commented
      system_stm32f4xx.c  CMSIS system file
      syscalls.c          Newlib syscall stubs
      sysmem.c            Heap support
    Startup/
      startup_stm32f401vetx.s
  STM32F401VETX_FLASH.ld  Flash linker script
  STM32F401VETX_RAM.ld    RAM linker script
  StopWatch.ioc           CubeMX configuration
  Debug/                  Build output, usually ignored in Git
Proteus/
  StopWatch.pdsprj        Proteus simulation project
docs/
  report.pdf              Project report
```

## Build Instructions

1. Install STM32CubeIDE.
2. Open STM32CubeIDE.
3. Import the project folder:

```text
File -> Import -> Existing Projects into Workspace
```

4. Select the `StopWatch` folder.
5. Make sure the STM32Cube FW F4 package is installed.
6. Build the project.
7. Use the generated HEX file from the build output.

For Proteus simulation, open `StopWatch.pdsprj`, select the STM32 microcontroller, load `StopWatch.hex`, and set the MCU clock frequency to 16 MHz.

## Important Notes

- The final application code uses direct register access and avoids HAL calls in the runtime logic.
- CubeMX-generated files are still present as project support files.
- If CubeMX regenerates code, check interrupt handlers carefully to avoid duplicate definitions of `SysTick_Handler`, `TIM2_IRQHandler`, and `EXTI4_IRQHandler`.
- For real hardware, drive the buzzer through a transistor if its current is higher than the GPIO pin can safely provide.
- PC13 LED polarity may differ on real development boards.

## Known Limitations

- No reset button is implemented.
- LCD writes are blocking.
- The active source and CubeMX `.ioc` settings should be kept synchronized before long-term maintenance.
- The generated Debug makefile may contain local absolute paths. Regenerate the build files in STM32CubeIDE if building on another computer.

## Credits

Course project for a microcontroller/microprocessor class.

Authors:

- Negar Siah Mansour
- Mohadeseh Esmaeilzade

Instructor:

- Dr. Amini
