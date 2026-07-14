# GitHub Setup Guide

## 1. Prepare the Project Folder

Recommended public repository layout:

```text
stm32-lcd-stopwatch/
  README.md
  .gitignore
  StopWatch/
    Core/
    STM32F401VETX_FLASH.ld
    STM32F401VETX_RAM.ld
    StopWatch.ioc
    .project
    .cproject
    .mxproject
  Proteus/
    StopWatch.pdsprj
  docs/
    Negar-Mohadeseh-HW4.pdf
```

Do not commit the full `Debug/` directory unless your instructor specifically asks for generated build output. If you want to provide a ready simulation file, place only the final HEX in a controlled location such as:

```text
release/StopWatch.hex
```

Important: the extracted source tree does not appear to include a full `Drivers/` directory. For a repository that builds cleanly on another computer, either:

- include the required generated STM32 `Drivers/` folder, or
- document that the user must open `StopWatch.ioc` in STM32CubeIDE and regenerate/install the STM32Cube FW F4 package.

## 2. Create a New Repository on GitHub

1. Go to [GitHub](https://github.com).
2. Sign in.
3. Click the `+` button in the top-right corner.
4. Select `New repository`.
5. Enter a repository name, for example:

```text
stm32-lcd-stopwatch
```

6. Choose visibility:
   - Public: anyone can view it.
   - Private: only invited users can view it.
7. Do not initialize with README, `.gitignore`, or license if you already have local files.
8. Click `Create repository`.

## 3. Suggested `.gitignore`

```gitignore
# Build output
Debug/
Release/
build/
cmake-build-*/

# Object and dependency files
*.o
*.obj
*.d
*.su
*.cyclo
*.gcno
*.gcda

# Firmware outputs
*.elf
*.hex
*.bin
*.map
*.list
*.lst
*.srec

# Keep release firmware only if intentionally added
!release/*.hex
!release/*.bin

# STM32CubeIDE / Eclipse workspace noise
.metadata/
.settings/
RemoteSystemsTempFiles/
*.launch
*.log

# Proteus temporary/user files
*.workspace
*.pdsprj.*.workspace
*.PDSPRJ.*.workspace
*.bak
*.tmp
*.DAT
LastLoaded*.DBK

# Editor and OS files
.vscode/
.idea/
*.swp
*.swo
Thumbs.db
Desktop.ini
.DS_Store

# Archives
*.zip
*.rar
*.7z
```

Do not ignore these important source/project files:

```text
Core/
Drivers/        if included
*.ioc
*.ld
.project
.cproject
.mxproject
*.pdsprj
README.md
docs/
```

## 4. Complete Git Command Sequence

Run these commands from the final project folder, for example `stm32-lcd-stopwatch`.

```bash
git init
git branch -M main
git status
git add .
git commit -m "Initial STM32 LCD stopwatch project"
git remote add origin https://github.com/YOUR_USERNAME/stm32-lcd-stopwatch.git
git push -u origin main
```

If Git asks for authentication, use GitHub login through the browser or a GitHub personal access token, depending on your Git setup.

## 5. If You Already Created a README on GitHub

If the GitHub repository was initialized with a README, pull first:

```bash
git init
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/stm32-lcd-stopwatch.git
git pull origin main --allow-unrelated-histories
git add .
git commit -m "Add STM32 LCD stopwatch project"
git push -u origin main
```

## 6. Recommended README Sections

Use this structure:

```text
# Project Title
Badges

## Overview
Short description of the project.

## Features
Main capabilities.

## Hardware
Parts list.

## Pin Connections
Circuit wiring table.

## Architecture
Block diagram or flowchart.

## How It Works
Timers, interrupts, buttons, LCD, LED, buzzer.

## Build Instructions
STM32CubeIDE steps.

## Simulation
Proteus setup and HEX loading.

## Project Structure
Folder/file explanation.

## Known Limitations
Important caveats.

## Credits
Authors, course, instructor.
```

## 7. Technical Summary

The firmware is a register-level STM32F401VETx stopwatch. TIM2 creates a 1 ms interrupt and increments the stopwatch counter while the stopwatch is running. PE4 uses EXTI4 for Start/Pause, PE5 is polled for LED speed changes, PC13 drives an LED, PB6 drives a buzzer, and PB0/PB1/PB2/PB10/PB13/PB12 drive a 16x2 LCD in 4-bit mode. SysTick provides a separate helper millisecond counter for debounce, LCD timing, LED scheduling, and buzzer pulse timing.

## 8. Non-Technical Summary

This project is a simulated electronic stopwatch. It shows time on an LCD screen, starts and pauses with a button, changes a blinking light speed with another button, and makes a short beep at even seconds.
