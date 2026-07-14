#include "stm32f4xx.h"
#include <stdint.h>
#include <stdio.h>

/* ===================== Pin Definitions ===================== */

/* LCD */
#define LCD_RS_PIN   0    // PB0
#define LCD_E_PIN    1    // PB1
#define LCD_D4_PIN   2    // PB2
#define LCD_D5_PIN   10   // PB10
#define LCD_D6_PIN   13   // PB13
#define LCD_D7_PIN   12   // PB12

/* Buzzer */
#define BUZZER_PIN   6    // PB6

/* LED */
#define LED_PIN      13   // PC13

/* Buttons */
#define START_PIN    4    // PE4 -> EXTI4
#define SPEED_PIN    5    // PE5


/* ===================== Global Variables ===================== */

volatile uint32_t sys_ms = 0;

volatile uint32_t stopwatch_ms = 0;
volatile uint8_t stopwatch_running = 0;

volatile uint32_t last_start_irq_time = 0;

uint32_t led_delay_ms = 3000;
uint32_t last_led_toggle = 0;

uint32_t last_lcd_update = 0;

uint32_t last_checked_second = 0;
uint8_t buzzer_active = 0;
uint32_t buzzer_off_time = 0;


/* ===================== Function Prototypes ===================== */

void Clock_Init(void);
void GPIO_Init(void);
void TIM2_Init(void);
void EXTI4_Init(void);
void SysTick_Init(void);

void delay_ms(uint32_t ms);

void LCD_Init(void);
void LCD_Command(uint8_t cmd);
void LCD_Data(uint8_t data);
void LCD_Send4Bit(uint8_t data);
void LCD_EnablePulse(void);
void LCD_SetCursor(uint8_t row, uint8_t col);
void LCD_Print(char *str);
void LCD_PrintLine(uint8_t row, char *str);

void Process_Speed_Button(void);
void Process_LED(void);
void Process_Buzzer(uint32_t current_ms);
void Update_LCD(uint32_t current_ms);


/* ===================== Main ===================== */

int main(void)
{
    Clock_Init();
    SysTick_Init();
    GPIO_Init();
    TIM2_Init();
    EXTI4_Init();

    LCD_Init();

    LCD_PrintLine(0, "HW4 Stopwatch");
    LCD_PrintLine(1, "No HAL Code");
    delay_ms(1000);
    LCD_Command(0x01);

    while (1)
    {
        uint32_t now = sys_ms;
        uint32_t current_ms = stopwatch_ms;

        Process_Speed_Button();
        Process_LED();
        Process_Buzzer(current_ms);

        if (now - last_lcd_update >= 50)
        {
            last_lcd_update = now;
            Update_LCD(current_ms);
        }
    }
}


/* ===================== Clock Init ===================== */
/*
 * از کلاک داخلی HSI استفاده می‌کنیم.
 * فرکانس پیش‌فرض HSI برابر 16MHz است.
 * پس در Proteus هم Clock Frequency را 16MHz بگذار.
 */
void Clock_Init(void)
{
    RCC->CR |= RCC_CR_HSION;

    while (!(RCC->CR & RCC_CR_HSIRDY));

    RCC->CFGR = 0x00000000;

    SystemCoreClock = 16000000;
}


/* ===================== SysTick Init ===================== */
/*
 * SysTick هر 1ms وقفه می‌دهد.
 * از SysTick فقط برای delay، debounce و زمان‌بندی LED استفاده شده.
 * شمارش کرونومتر با TIM2 انجام می‌شود.
 */
void SysTick_Init(void)
{
    SysTick->LOAD = 16000 - 1;
    SysTick->VAL = 0;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk |
                    SysTick_CTRL_TICKINT_Msk |
                    SysTick_CTRL_ENABLE_Msk;
}


/* ===================== GPIO Init ===================== */

void GPIO_Init(void)
{
    /* Enable GPIOB, GPIOC, GPIOE Clock */
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOBEN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOCEN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOEEN;

    /* یک تاخیر کوچک بعد از فعال شدن کلاک */
    __NOP();
    __NOP();

    /* ---------- GPIOB Outputs ----------
       PB0  -> LCD RS
       PB1  -> LCD E
       PB2  -> LCD D4
       PB6  -> Buzzer
       PB10 -> LCD D5
       PB12 -> LCD D7
       PB13 -> LCD D6
    */

    GPIOB->MODER &= ~((3U << (LCD_RS_PIN * 2)) |
                      (3U << (LCD_E_PIN  * 2)) |
                      (3U << (LCD_D4_PIN * 2)) |
                      (3U << (LCD_D5_PIN * 2)) |
                      (3U << (LCD_D6_PIN * 2)) |
                      (3U << (LCD_D7_PIN * 2)) |
                      (3U << (BUZZER_PIN * 2)));

    GPIOB->MODER |=  ((1U << (LCD_RS_PIN * 2)) |
                      (1U << (LCD_E_PIN  * 2)) |
                      (1U << (LCD_D4_PIN * 2)) |
                      (1U << (LCD_D5_PIN * 2)) |
                      (1U << (LCD_D6_PIN * 2)) |
                      (1U << (LCD_D7_PIN * 2)) |
                      (1U << (BUZZER_PIN * 2)));

    /* Output type: Push Pull */
    GPIOB->OTYPER &= ~((1U << LCD_RS_PIN) |
                       (1U << LCD_E_PIN)  |
                       (1U << LCD_D4_PIN) |
                       (1U << LCD_D5_PIN) |
                       (1U << LCD_D6_PIN) |
                       (1U << LCD_D7_PIN) |
                       (1U << BUZZER_PIN));

    /* No Pull-up/Pull-down for outputs */
    GPIOB->PUPDR &= ~((3U << (LCD_RS_PIN * 2)) |
                      (3U << (LCD_E_PIN  * 2)) |
                      (3U << (LCD_D4_PIN * 2)) |
                      (3U << (LCD_D5_PIN * 2)) |
                      (3U << (LCD_D6_PIN * 2)) |
                      (3U << (LCD_D7_PIN * 2)) |
                      (3U << (BUZZER_PIN * 2)));

    /* ---------- PC13 Output LED ---------- */

    GPIOC->MODER &= ~(3U << (LED_PIN * 2));
    GPIOC->MODER |=  (1U << (LED_PIN * 2));

    GPIOC->OTYPER &= ~(1U << LED_PIN);

    GPIOC->PUPDR &= ~(3U << (LED_PIN * 2));

    /* ---------- PE4, PE5 Inputs with Pull-up ---------- */

    GPIOE->MODER &= ~((3U << (START_PIN * 2)) |
                      (3U << (SPEED_PIN * 2)));

    GPIOE->PUPDR &= ~((3U << (START_PIN * 2)) |
                      (3U << (SPEED_PIN * 2)));

    GPIOE->PUPDR |=  ((1U << (START_PIN * 2)) |
                      (1U << (SPEED_PIN * 2)));

    /* مقدار اولیه خروجی‌ها صفر */
    GPIOB->BSRR = (1U << (LCD_RS_PIN + 16)) |
                  (1U << (LCD_E_PIN  + 16)) |
                  (1U << (LCD_D4_PIN + 16)) |
                  (1U << (LCD_D5_PIN + 16)) |
                  (1U << (LCD_D6_PIN + 16)) |
                  (1U << (LCD_D7_PIN + 16)) |
                  (1U << (BUZZER_PIN + 16));

    GPIOC->BSRR = (1U << (LED_PIN + 16));
}


/* ===================== TIM2 Init ===================== */
/*
 * TIM2 برای شمارش کرونومتر است.
 *
 * Clock = 16MHz
 * Prescaler = 15
 * Timer Clock = 16MHz / (15 + 1) = 1MHz
 * ARR = 999
 * Interrupt Frequency = 1MHz / (999 + 1) = 1000Hz
 * یعنی هر 1ms یک وقفه
 */
void TIM2_Init(void)
{
    RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;

    TIM2->PSC = 15;
    TIM2->ARR = 999;

    TIM2->CNT = 0;

    TIM2->DIER |= TIM_DIER_UIE;

    TIM2->SR = 0;

    NVIC_SetPriority(TIM2_IRQn, 1);
    NVIC_EnableIRQ(TIM2_IRQn);

    TIM2->CR1 |= TIM_CR1_CEN;
}


/* ===================== EXTI4 Init ===================== */
/*
 * PE4 برای کلید Start/Pause
 * چون کلید به GND وصل است و Pull-up داخلی داریم،
 * هنگام فشردن کلید لبه Falling ایجاد می‌شود.
 */
void EXTI4_Init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_SYSCFGEN;

    /* EXTI4 روی Port E */
    SYSCFG->EXTICR[1] &= ~(0xFU << 0);
    SYSCFG->EXTICR[1] |=  (0x4U << 0);

    EXTI->IMR |= (1U << START_PIN);

    EXTI->FTSR |= (1U << START_PIN);
    EXTI->RTSR &= ~(1U << START_PIN);

    EXTI->PR = (1U << START_PIN);

    NVIC_SetPriority(EXTI4_IRQn, 0);
    NVIC_EnableIRQ(EXTI4_IRQn);
}


/* ===================== Delay ===================== */

void delay_ms(uint32_t ms)
{
    uint32_t start = sys_ms;

    while ((sys_ms - start) < ms)
    {
        /* wait */
    }
}


/* ===================== Interrupt Handlers ===================== */

void SysTick_Handler(void)
{
    sys_ms++;
}


/*
 * وقفه TIM2
 * اینجا فقط شمارش کرونومتر انجام می‌شود.
 * پردازش زوج بودن اینجا انجام نشده.
 */
void TIM2_IRQHandler(void)
{
    if (TIM2->SR & TIM_SR_UIF)
    {
        TIM2->SR &= ~TIM_SR_UIF;

        if (stopwatch_running)
        {
            stopwatch_ms++;
        }
    }
}


/*
 * وقفه خارجی PE4
 * Start/Pause
 */
void EXTI4_IRQHandler(void)
{
    if (EXTI->PR & (1U << START_PIN))
    {
        EXTI->PR = (1U << START_PIN);

        if ((sys_ms - last_start_irq_time) >= 200)
        {
            last_start_irq_time = sys_ms;

            if (stopwatch_running)
            {
                stopwatch_running = 0;
            }
            else
            {
                stopwatch_running = 1;
            }
        }
    }
}


/* ===================== LCD Functions ===================== */

void LCD_EnablePulse(void)
{
    GPIOB->BSRR = (1U << LCD_E_PIN);
    delay_ms(1);

    GPIOB->BSRR = (1U << (LCD_E_PIN + 16));
    delay_ms(1);
}


void LCD_Send4Bit(uint8_t data)
{
    if (data & 0x01)
        GPIOB->BSRR = (1U << LCD_D4_PIN);
    else
        GPIOB->BSRR = (1U << (LCD_D4_PIN + 16));

    if (data & 0x02)
        GPIOB->BSRR = (1U << LCD_D5_PIN);
    else
        GPIOB->BSRR = (1U << (LCD_D5_PIN + 16));

    if (data & 0x04)
        GPIOB->BSRR = (1U << LCD_D6_PIN);
    else
        GPIOB->BSRR = (1U << (LCD_D6_PIN + 16));

    if (data & 0x08)
        GPIOB->BSRR = (1U << LCD_D7_PIN);
    else
        GPIOB->BSRR = (1U << (LCD_D7_PIN + 16));

    LCD_EnablePulse();
}


void LCD_Command(uint8_t cmd)
{
    GPIOB->BSRR = (1U << (LCD_RS_PIN + 16));

    LCD_Send4Bit(cmd >> 4);
    LCD_Send4Bit(cmd & 0x0F);

    delay_ms(2);
}


void LCD_Data(uint8_t data)
{
    GPIOB->BSRR = (1U << LCD_RS_PIN);

    LCD_Send4Bit(data >> 4);
    LCD_Send4Bit(data & 0x0F);

    delay_ms(1);
}


void LCD_Init(void)
{
    delay_ms(50);

    GPIOB->BSRR = (1U << (LCD_RS_PIN + 16));
    GPIOB->BSRR = (1U << (LCD_E_PIN + 16));

    LCD_Send4Bit(0x03);
    delay_ms(5);

    LCD_Send4Bit(0x03);
    delay_ms(5);

    LCD_Send4Bit(0x03);
    delay_ms(1);

    LCD_Send4Bit(0x02);
    delay_ms(1);

    LCD_Command(0x28);
    LCD_Command(0x0C);
    LCD_Command(0x06);
    LCD_Command(0x01);
    delay_ms(2);
}


void LCD_SetCursor(uint8_t row, uint8_t col)
{
    uint8_t address;

    if (row == 0)
        address = 0x80 + col;
    else
        address = 0xC0 + col;

    LCD_Command(address);
}


void LCD_Print(char *str)
{
    while (*str)
    {
        LCD_Data((uint8_t)(*str));
        str++;
    }
}


void LCD_PrintLine(uint8_t row, char *str)
{
    char buffer[17];
    uint8_t i;

    for (i = 0; i < 16; i++)
    {
        buffer[i] = ' ';
    }

    buffer[16] = '\0';

    for (i = 0; i < 16 && str[i] != '\0'; i++)
    {
        buffer[i] = str[i];
    }

    LCD_SetCursor(row, 0);
    LCD_Print(buffer);
}


/* ===================== User Processes ===================== */

void Process_Speed_Button(void)
{
    static uint8_t last_state = 1;
    static uint32_t last_debounce = 0;

    uint8_t current_state;

    if (GPIOE->IDR & (1U << SPEED_PIN))
        current_state = 1;
    else
        current_state = 0;

    if (current_state != last_state)
    {
        if ((sys_ms - last_debounce) >= 80)
        {
            last_debounce = sys_ms;
            last_state = current_state;

            if (current_state == 0)
            {
                if (led_delay_ms == 3000)
                    led_delay_ms = 1500;
                else if (led_delay_ms == 1500)
                    led_delay_ms = 750;
                else if (led_delay_ms == 750)
                    led_delay_ms = 375;
                else
                    led_delay_ms = 3000;
            }
        }
    }
}


void Process_LED(void)
{
    if ((sys_ms - last_led_toggle) >= led_delay_ms)
    {
        last_led_toggle = sys_ms;

        GPIOC->ODR ^= (1U << LED_PIN);
    }
}


void Process_Buzzer(uint32_t current_ms)
{
    uint32_t current_second = current_ms / 1000;

    /*
     * پردازش زوج بودن عدد کرونومتر اینجا انجام می‌شود،
     * یعنی در حلقه اصلی، نه در وقفه.
     *
     * برای جلوگیری از بوق ممتد، هر بار که ثانیه زوج جدید برسد
     * فقط یک بوق کوتاه زده می‌شود.
     */
    if (current_second != last_checked_second)
    {
        last_checked_second = current_second;

        if (stopwatch_running && current_second != 0 && (current_second % 2 == 0))
        {
            GPIOB->BSRR = (1U << BUZZER_PIN);
            buzzer_active = 1;
            buzzer_off_time = sys_ms + 100;
        }
    }

    if (buzzer_active)
    {
        if ((int32_t)(sys_ms - buzzer_off_time) >= 0)
        {
            GPIOB->BSRR = (1U << (BUZZER_PIN + 16));
            buzzer_active = 0;
        }
    }
}


void Update_LCD(uint32_t current_ms)
{
    char line1[17];
    char line2[17];

    uint32_t total_seconds = current_ms / 1000;
    uint32_t minutes = total_seconds / 60;
    uint32_t seconds = total_seconds % 60;
    uint32_t milliseconds = current_ms % 1000;

    if (minutes > 99)
        minutes = 99;

    sprintf(line1, "%02lu:%02lu.%03lu %s",
            (unsigned long)minutes,
            (unsigned long)seconds,
            (unsigned long)milliseconds,
            stopwatch_running ? "RUN" : "PAU");

    sprintf(line2, "LED:%4lu ms",
            (unsigned long)led_delay_ms);

    LCD_PrintLine(0, line1);
    LCD_PrintLine(1, line2);
}
