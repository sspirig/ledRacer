import array
from machine import Pin
import random
import re
from rp2 import PIO, StateMachine, asm_pio
import time


class LedController:
    """
    Contrôle d'une bandeau lumineux de type WS2812
    """

    BLUE = (0, 87, 183)
    BLACK = (0, 0, 0)
    GREEN = (0,255,0)
    MAX_LUMINOSITY_ALLOWED = 0.4
    CYAN = (0,255,255)
    MAGENTA = (255,0,255)
    RED = (255,0,0)
    YELLOW = (255, 215, 0)
    RED_PLAYER_POS = 0 # RACE VARIABLES
    BLUE_PLAYER_POS = 0
    R_posId = 0
    B_posId = 0
    R_lastPos = 0
    B_lastPos = 0
    last_iB = 0
    last_iR = 0

    def __init__(self, num_leds=120):
        self.num_leds = num_leds
        self.pixel_array = array.array("I", [0 for _ in range(num_leds)])

        # Configure the StateMachine with the ws2812 program
        @asm_pio(sideset_init=PIO.OUT_LOW, out_shiftdir=PIO.SHIFT_LEFT,
                 autopull=True, pull_thresh=24)
        def ws2812():
            T1 = 2
            T2 = 5
            T3 = 3
            label("bitloop")
            out(x, 1) .side(0) [T3 - 1]
            jmp(not_x, "do_zero") .side(1) [T1 - 1]
            jmp("bitloop") .side(1) [T2 - 1]
            label("do_zero")
            nop() .side(0) [T2 - 1]

        self.sm = StateMachine(0, ws2812, freq=8000000, sideset_base=Pin(0))
        self.sm.active(1)
        
    def UpdateRedSpeed(self, newSpeed):
        self.last_iR = newSpeed
        
    def set_led_color(self, color, count=None):
        """  définit une couleur pour un nombre de LED donné (en partant de la 1ère) """
        #print("set_led_color")
        if count is None: count = len(self.pixel_array)
        for ii in range(count):
            self.pixel_array[ii] = (color[1]<<16) + (color[0]<<8) + color[2]

    def moveRed(self, incrementR, mainSelf):
        """ appel set_led_color pour la nouvelle position du joueur rouge """
        print(f"move red from {self.R_lastPos} of {incrementR} indexes")
        self.R_lastPos = self.R_posId
        self.R_posId = self.R_posId + incrementR
        self.set_led_color(self.BLACK, self.R_lastPos) # faire belek a ça
        if (self.R_posId < 119):
            self.set_led_color(self.RED)
            
        else:
            print(f"R_PosId > ou = 120 : {R_PosId}")
        if (self.B_posId == self.R_posId):
            # si ils sont a la meme position
            print("same position")
            self.set_led_color(self.MAGENTA, self.R_posId)
            self.set_led_color(self.BLACK, self.R_lastPos)
        else:
            # si ils sont pas a la meme position
            print("different positions")
            self.set_led_color(self.RED, self.R_posId)
            if (self.R_posId > self.B_posId):
                print(f"red is ahead of blue : ({self.B_posId})")
                self.set_led_color(self.BLACK, self.R_lastPos)
                self.set_led_color(self.BLUE, self.B_posId)
                if (self.B_lastPos != 0):
                    # si la derniere pos de bleu n'est pas au tout debut
                    self.set_led_color(self.BLACK, self.B_lastPos)
            else:
                print("red is behind of blue")
                self.set_led_color(self.BLACK, self.R_lastPos)
        newPos = self.R_posId
        self.update_pixel()
        mainSelf.send(f"moveRed:"+str(newPos))
    def moveBlue(self, incrementB, mainSelf):
        """ appel set_led_color pour la nouvelle position du joueur bleu """
        print(f"move blue from {self.B_lastPos} to {incrementB}")
        self.B_lastPos = self.B_posId
        self.B_posId = self.B_posId + incrementB
        if (self.B_posId < 120):
            self.set_led_color(self.BLUE)
        else:
            print(f"B_PosId > ou = 119 : {B_PosId}")
        self.set_led_color(self.BLACK, self.B_lastPos) # faire belek a ça
        
        if (self.R_posId == self.B_posId):
            # si ils sont a la meme position
            print("same position")
            self.set_led_color(self.MAGENTA, self.B_posId)
            self.set_led_color(self.BLACK, self.B_lastPos)
        else:
            # si ils sont pas a la meme position
            print("different positions")
            self.set_led_color(self.BLUE, self.B_posId)
            if (self.B_posId > self.R_posId):
                print(f"blue is ahead of red: ({self.R_posId})")
                self.set_led_color(self.BLACK, self.B_lastPos)
                self.set_led_color(self.RED, self.R_posId)
                if (self.R_lastPos != 0):
                    # si la derniere pos de rouge n'est pas au tout debut
                    self.set_led_color(self.BLACK, self.R_lastPos)    
            else:
                print("blue is behind of red")
                self.set_led_color(self.BLACK, self.B_lastPos)
        
        self.update_pixel()
        newPos = self.B_posId
        mainSelf.send(f"moveBlue:"+str(newPos))
    def setupLedRacer(self, mainSelf):
        """ commence la OPEN LED Race  """
        mainSelf.send("Starting Race<br><span>HEY</span>")
        print("setupLedRacer")
        self.R_posId = 1
        self.B_posId = 1
        self.R_lastPos = 0
        self.B_lastPos = 0
        self.set_led_color(self.MAGENTA, self.R_posId)
        
        self.update_pixel()
        
    def loopBlueRed(self, mainSelf):
        """ commence la boucle bleu rouge  """
        print("loopBlueRed")
        # NOTE: toute la function start racing peut etre dans main.py, ça sera plus simple pour la suite
        # NOTE: il faut faire une pwa avec chrome://flags (rechercher bluetooth) enable et un frontend qui utilise
        # navigator.bluetooth pour afficher les appareils autour du mobile
        INTERVAL = 0.01 # in second
        for iB, iR in zip(range(135), range(135)) :
            # eteindre dernier pixel allumé
            self.set_led_color(self.BLACK, self.last_iB)
            self.set_led_color(self.BLACK, self.last_iR)
            
            iR = iR + 1;
            
            self.set_led_color(self.RED, iR)
            self.set_led_color(self.BLUE, iB)
            
            
            self.R_lastPos = iB;
            self.B_lastPos = iR;
            
            #print(f"blue pos: {iB} ")
            #print(f"last blue pos: {self.B_lastPos}")
            #print(f"red pos: {iR} ")
            #print(f"last red pos: {self.R_lastPos}", end='\r')
            
            self.set_led_color(self.BLACK, self.last_iB-1)
            
            self.update_pixel()
            mainSelf.send("count:count")
            
            time.sleep(INTERVAL)

    #def set_red_green_blue_loop(self):
        """ défilement progressif en rouge, vers puis bleu de chaque LED du bandeau """
        #print("set_red_green_blue_loop")
        
        #COLORS = [self.RED, self.GREEN, self.BLUE]
        #INTERVAL = 0.10 # in second
        #for color in COLORS:
            #print(f"start new {color}")
            #for i in range(self.num_leds):
                #self.set_led_color(color, i)
                
                #print(f"updated {color} for {i}", end='\r')
                
                
                # eteindre dernier pixel allumé
                #last_i = i - 1;
                #self.set_led_color(self.BLACK, last_i)
                #self.update_pixel()
                #print(f"turned off {color} for {last_i}", end='\r')
                #time.sleep(INTERVAL)
    def set_random(self):
        """ couleur aléatoire pour l'ensemble des LED du bandeau """
        print("set_random")
        #self.set_led_color((random.randrange(255), random.randrange(255), random.randrange(255)))
        #self.update_pixel()

    def update_pixel(self, brightness=None):
        """ conversion dans le format de sortie puis envoi du tableau des couleurs vers le bandeau """
        #print("update_pixel")
        if brightness is None: brightness = self.MAX_LUMINOSITY_ALLOWED
        dimmer_array = array.array("I", [0 for _ in range(self.num_leds)])
        for ii, cc in enumerate(self.pixel_array):
            r = int(((cc >> 8) & 0xFF) * brightness)
            g = int(((cc >> 16) & 0xFF) * brightness)
            b = int((cc & 0xFF) * brightness)
            dimmer_array[ii] = (g << 16) + (r << 8) + b
        self.sm.put(dimmer_array, 8)

